/* Real vaults from this release's wrapper, against the in-memory server: no mocks. The library is loaded into this
 * realm the way a page loads it, after its twelve hashes are checked against VENDOR.md. */
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { startServer } from './server.mjs'
import { loadVaultLibrary, recordedHashes, ORDER, VENDOR, sha } from './_lib.mjs'

let s, v, sg, storage
before(async () => {
    const rec = recordedHashes()
    for (const f of ORDER) assert.equal(sha(path.join(VENDOR, f)), rec[f], `${f} hashes to what VENDOR.md records`)
    loadVaultLibrary()
    v  = await import('../send/send-vault.js')
    s  = await startServer()
    sg = v.client({ endpoint: s.base, accessToken: s.token })
    storage = new Map(); storage.getItem = k => storage.get(k) || null; storage.setItem = (k, val) => storage.set(k, val)
})
after(async () => { await s.close() })

test('ready() finds the library already in the realm', async () => {
    const g = await v.ready()
    assert.equal(typeof g.SGVault.create, 'function')
})

test('a passphrase is 24 chars of [a-z0-9]; a clone branch is made once per device', () => {
    assert.match(v.randomPassphrase(), /^[a-z0-9]{24}$/)
    const a = v.cloneBranch(storage), b = v.cloneBranch(storage)
    assert.equal(a, b); assert.match(a, /^send-[0-9a-f]{8}$/)
})

test('create a vault, write files, publish, open again from the vault key and from the read key', async () => {
    const { vault, vaultId, vaultKey, readKey } = await v.createVault(sg, { name: 'Test vault' })
    assert.match(vaultKey, new RegExp(`^sgit_private_vault_[a-z0-9]{24}:${vaultId}$`))
    assert.match(readKey, new RegExp(`^sgit_public_read_[0-9a-f]{64}:${vaultId}$`))
    assert.ok(s.vaults().includes(vaultId))
    await v.writeFiles(vault, [{ folder: '/', name: 'README.md', data: '# hello' }, { folder: '/photos/2026', name: 'a.bin', data: new Uint8Array([1, 2, 3]) }])
    await v.publish(vault)
    const again = await v.openVault(sg, vaultKey, { cloneBranch: 'send-other' })
    assert.equal(await v.readText(again, '/', 'README.md'), '# hello')
    assert.deepEqual(new Uint8Array(await v.readFile(again, '/photos/2026', 'a.bin')), new Uint8Array([1, 2, 3]))
    assert.deepEqual((await v.listAll(again)).map(f => f.path).sort(), ['/README.md', '/photos/2026/a.bin'])
    const ro = await v.openReadOnly(sg, readKey)
    assert.equal(ro.writable, false)
    assert.equal(await v.readText(ro, '/', 'README.md'), '# hello')
    const viaOpen = await v.openVault(sg, readKey)
    assert.equal(viaOpen.writable, false)
    assert.ok(!s.log.some(l => /X-API-Key/i.test(l)), 'the browser client never asked for X-API-Key')
})

test('a write into a nested folder after a fresh open is there afterwards (the lazy-folder trap)', async () => {
    const { vault, vaultKey } = await v.createVault(sg, { name: 'Nested' })
    await v.writeFile(vault, '/notes/2026/10', 'one.md', 'one'); await v.publish(vault)
    const r2 = await v.openVault(sg, vaultKey, { cloneBranch: 'send-b2' })
    assert.ok(r2.needsLoading('/notes'))
    await v.writeFile(r2, '/notes/2026/10', 'two.md', 'two'); await v.publish(r2)
    const r3 = await v.openVault(sg, vaultKey, { cloneBranch: 'send-b3' })
    assert.equal(await v.readText(r3, '/notes/2026/10', 'one.md'), 'one')
    assert.equal(await v.readText(r3, '/notes/2026/10', 'two.md'), 'two')
})

test('two clients racing a publish: the second merges and both changes survive', async () => {
    const { vaultKey } = await v.createVault(sg, { name: 'Race' })
    const A = await v.openVault(sg, vaultKey, { cloneBranch: 'send-A' }), B = await v.openVault(sg, vaultKey, { cloneBranch: 'send-B' })
    await v.writeFile(A, '/race', 'a.txt', 'from A'); await v.writeFile(B, '/race', 'b.txt', 'from B')
    const before = s.stats.conflicts
    const ra = await v.publish(A), rb = await v.publish(B)
    assert.equal(ra.merged, false); assert.equal(rb.merged, true)
    assert.ok(s.stats.conflicts > before)
    const C = await v.openVault(sg, vaultKey, { cloneBranch: 'send-C' })
    assert.equal(await v.readText(C, '/race', 'a.txt'), 'from A')
    assert.equal(await v.readText(C, '/race', 'b.txt'), 'from B')
})

test('updating a file is a new commit in the history, and a wrong write key is refused by the server', async () => {
    const { vault, vaultKey } = await v.createVault(sg, { name: 'History' })
    await v.writeFile(vault, '/', 'doc.txt', 'v1'); await v.writeFile(vault, '/', 'doc.txt', 'v2'); await v.publish(vault)
    const log = await v.history(vault)
    assert.ok(log.length >= 3, 'create, add, update')
    const again = await v.openVault(sg, vaultKey, { cloneBranch: 'send-H' })
    assert.equal(await v.readText(again, '/', 'doc.txt'), 'v2')
    const { vaultId } = await v.createVault(sg, { name: 'Other' })
    const res = await fetch(`${s.base}/api/vault/write/${vaultId}/x`, { method: 'PUT', headers: { 'x-sgraph-access-token': s.token, 'x-sgraph-vault-write-key': 'f'.repeat(64) }, body: 'x' })
    assert.equal(res.status, 403)
})

test('creating a vault without an access token fails and nothing is stored', async () => {
    const anon = v.client({ endpoint: s.base })
    const n = s.vaults().length
    await assert.rejects(v.createVault(anon, { name: 'nope' }))
    assert.equal(s.vaults().length, n)
})
