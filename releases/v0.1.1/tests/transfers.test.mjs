import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { startServer } from './server.mjs'
import { SendTransfers, TransferError } from '../send/send-transfers.js'
import * as fr from '../send/send-friendly.js'
import * as link from '../send/send-link.js'

let s, api, anon
before(async () => { s = await startServer(); api = new SendTransfers({ endpoint: s.base, accessToken: s.token }); anon = new SendTransfers({ endpoint: s.base }) })
after(async () => { await s.close() })

test('send then receive: the file comes back byte for byte with its name, which never reached the server', async () => {
    const bytes = new Uint8Array(5000).map((_, i) => i % 251)
    const steps = []
    const r = await api.send({ bytes, filename: 'report.pdf', contentTypeHint: 'application/pdf', onProgress: st => steps.push(st) })
    assert.deepEqual(steps, ['wrap', 'encrypt', 'create', 'upload', 'complete'])
    assert.equal(r.keyString.length, 43)
    assert.equal(r.encryptedBytes, bytes.length + 7 + 4 + JSON.stringify({ filename: 'report.pdf' }).length + 28)
    const got = await anon.receive({ transferId: r.transferId, keyString: r.keyString })
    assert.equal(got.filename, 'report.pdf')
    assert.deepEqual(got.bytes, bytes)
    assert.ok(!s.log.some(l => l.includes('report.pdf')), 'the name is not in any request path')
    const info = await anon.info(r.transferId)
    assert.equal(info.content_type_hint, 'application/pdf')
    assert.equal(info.download_count, 1)
    const stored = s.transfers.get(r.transferId).payload
    assert.ok(!Buffer.from(stored).includes(Buffer.from('report.pdf')), 'the stored bytes do not contain the name')
})

test('a friendly token derives the id and the key on both sides; the link is just the token', async () => {
    const token = fr.newFriendlyToken()
    const r = await api.send({ bytes: 'hello', filename: 'hi.txt', friendlyToken: token })
    assert.equal(r.transferId, await fr.deriveTransferId(token))
    assert.equal(r.keyString, null)
    const parsed = link.parseFragment(link.friendlyLink({ openUrl: 'https://send.sgit.ai/open/', token }))
    const got = await anon.receive({ friendlyToken: parsed.token })
    assert.equal(new TextDecoder().decode(got.bytes), 'hello')
})

test('the same friendly token cannot be used twice (the id is taken)', async () => {
    const token = fr.newFriendlyToken()
    await api.send({ bytes: 'one', filename: 'a', friendlyToken: token })
    await assert.rejects(api.send({ bytes: 'two', filename: 'b', friendlyToken: token }), e => e instanceof TransferError && e.status === 409)
})

test('no access token is EAUTH on create; download and info are public', async () => {
    await assert.rejects(anon.send({ bytes: 'x', filename: 'x' }), e => e.code === 'EAUTH')
    const r = await api.send({ bytes: 'x', filename: 'x' })
    assert.ok((await anon.download(r.transferId)).length > 0)
})

test('max_downloads is enforced: the third download of a two-download transfer is EGONE', async () => {
    const r = await api.send({ bytes: 'twice', filename: 't', maxDownloads: 2 })
    await anon.download(r.transferId); await anon.download(r.transferId)
    await assert.rejects(anon.download(r.transferId), e => e.code === 'EGONE' && e.status === 410)
})

test('an expired transfer is EGONE', async () => {
    const r = await api.send({ bytes: 'old', filename: 'o', expiresAt: Date.now() - 1000 })
    await assert.rejects(anon.download(r.transferId), e => e.code === 'EGONE')
})

test('a revocable transfer deletes with its secret and refuses without; then it is ENOTFOUND', async () => {
    const r = await api.send({ bytes: 'gone soon', filename: 'g', revocable: true })
    assert.ok(r.deleteSecret)
    assert.equal((await anon.info(r.transferId)).revocable, true)
    await assert.rejects(api.remove(r.transferId, 'wrong'), e => e.code === 'EFORBIDDEN')
    assert.equal((await api.remove(r.transferId, r.deleteSecret)).deleted, true)
    await assert.rejects(anon.info(r.transferId), e => e.code === 'ENOTFOUND')
})

test('a wrong key fails with EDECRYPT and a missing key with EKEY', async () => {
    const r = await api.send({ bytes: 'secret', filename: 's' })
    await assert.rejects(anon.receive({ transferId: r.transferId, keyString: 'B'.repeat(43) }), e => e.code === 'EDECRYPT')
    await assert.rejects(anon.receive({ transferId: r.transferId }), e => e.code === 'EKEY')
})

test('download-base64 carries the same bytes for a JSON-only client', async () => {
    const r = await api.send({ bytes: 'json path', filename: 'j' })
    const d = await anon.downloadBase64(r.transferId)
    assert.deepEqual(new Uint8Array(Buffer.from(d.content_base64, 'base64')), await anon.download(r.transferId))
})

test('the access token never appears in a URL and the key never appears in any request', async () => {
    const r = await api.send({ bytes: 'z', filename: 'z' })
    await anon.receive({ transferId: r.transferId, keyString: r.keyString })
    assert.ok(!s.log.some(l => l.includes(s.token)), 'token in a logged path')
    assert.ok(!s.log.some(l => l.includes(r.keyString)), 'key in a logged path')
})

test('a payload over the direct limit is refused before any request', async () => {
    await assert.rejects(api.upload('abcdefghijkl', new Uint8Array(4 * 1024 * 1024 + 1)), e => e.code === 'ETOOLARGE')
})

test('an unreachable host is ENETWORK', async () => {
    const dead = new SendTransfers({ endpoint: 'http://127.0.0.1:1', accessToken: 'x' })
    await assert.rejects(dead.info('abcdefghijkl'), e => e.code === 'ENETWORK')
})

test('health and version are read from /api/info/, the routes the hosted service serves; /api/health is a 404', async () => {
    assert.equal((await anon.health()).status, 'ok')
    assert.equal((await anon.version()).version, 'in-memory')
    const res = await fetch(`${s.base}/api/health`)
    assert.equal(res.status, 404)
    assert.ok(s.log.some(l => l === 'GET /api/info/health -> 200'))
})
