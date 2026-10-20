import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as link from '../send/send-link.js'
import * as fr from '../send/send-friendly.js'
import { WORDS, COMBINATIONS } from '../send/send-words.js'

const KEY = 'A'.repeat(43)

test('a friendly token is two words and four digits, from the list, and parses as friendly', () => {
    for (let i = 0; i < 20; i++) {
        const t = fr.newFriendlyToken()
        assert.ok(fr.isFriendlyToken(t), t)
        const [a, b, d] = t.split('-')
        assert.ok(WORDS.includes(a) && WORDS.includes(b) && /^\d{4}$/.test(d))
        assert.equal(link.parseFragment('#' + t).kind, 'friendly')
    }
    assert.equal(COMBINATIONS, WORDS.length * WORDS.length * 10000)
})

test('the friendly derivations match send.sgraph.ai (sha256 prefix for the id; PBKDF2 key is 32 bytes)', async () => {
    assert.equal(await fr.deriveTransferId('apple-mango-5623'), '4abd0a491ed3')   // sha256("apple-mango-5623")[:12], recomputed independently in the test below
    const k = await fr.deriveKey('apple-mango-5623')
    const raw = new Uint8Array(await globalThis.crypto.subtle.exportKey('raw', k))
    assert.equal(raw.length, 32)
})

test('the id prefix is the first 12 hex of sha256, computed independently', async () => {
    const h = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode('apple-mango-5623'))
    const hex = [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
    assert.equal(hex.slice(0, 12), await fr.deriveTransferId('apple-mango-5623'))
})

test('fragments parse: transfer with key, link only, friendly, vault key, read key, and the | truncation', () => {
    assert.deepEqual(link.parseFragment(`https://send.sgit.ai/open/#abc123def456/${KEY}`), { kind: 'transfer', transferId: 'abc123def456', key: KEY })
    assert.deepEqual(link.parseFragment('#abc123def456'), { kind: 'transfer', transferId: 'abc123def456', key: null })
    assert.deepEqual(link.parseFragment(`#abc123def456/${KEY}|ignored`), { kind: 'transfer', transferId: 'abc123def456', key: KEY })
    assert.equal(link.parseFragment('#river-cloud-3847').token, 'river-cloud-3847')
    const vk = link.parseFragment('#sgit_private_vault_abcdefghijklmnopqrstuvwx:ab12cd34')
    assert.equal(vk.kind, 'vault-key'); assert.equal(vk.vaultId, 'ab12cd34'); assert.equal(vk.declared, 'vault')
    const rk = link.parseFragment('#sgit_public_read_' + 'a'.repeat(64) + ':ab12cd34')
    assert.equal(rk.kind, 'read-key'); assert.equal(rk.declared, 'read-public')
    assert.equal(link.parseFragment('#' + 'b'.repeat(64) + ':ab12cd34').kind, 'read-key')   // bare: the shape, 64 hex
    assert.equal(link.parseFragment('#somepass:ab12cd34').kind, 'vault-key')                 // bare: a passphrase is write access
    assert.equal(link.parseFragment('').kind, 'empty')
    assert.equal(link.parseFragment('#???').kind, 'unknown')
})

test('classification is by declaration first: a 64-hex secret under the vault prefix is a vault key', () => {
    const p = link.parseVaultCredential('sgit_private_vault_' + 'c'.repeat(64) + ':zz99zz99')
    assert.equal(p.kind, 'vault')
})

test('links are built on the open page with the fragment, and refuse bad input', () => {
    assert.equal(link.transferLink({ openUrl: 'https://send.sgit.ai/open/', transferId: 'abc123def456', key: KEY }), `https://send.sgit.ai/open/#abc123def456/${KEY}`)
    assert.equal(link.transferLink({ openUrl: 'https://send.sgit.ai/open', transferId: 'abc123def456' }), 'https://send.sgit.ai/open/#abc123def456')
    assert.equal(link.friendlyLink({ openUrl: 'https://send.sgit.ai/open/', token: 'river-cloud-3847' }), 'https://send.sgit.ai/open/#river-cloud-3847')
    assert.throws(() => link.friendlyLink({ openUrl: 'x', token: 'nope' }))
    assert.equal(link.publicReadKey('d'.repeat(64), 'ab12cd34'), 'sgit_public_read_' + 'd'.repeat(64) + ':ab12cd34')
    assert.equal(link.privateVaultKey('pass', 'ab12cd34'), 'sgit_private_vault_pass:ab12cd34')
    assert.equal(link.vaultLink({ openUrl: 'https://send.sgit.ai/open/', credential: link.publicReadKey('d'.repeat(64), 'ab12cd34') }).split('#')[1], 'sgit_public_read_' + 'd'.repeat(64) + ':ab12cd34')
})
