import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Keyring, KINDS, KEY } from '../send/send-keyring.js'

test('entries are added with a kind, listed newest first, filtered, updated and removed', () => {
    const k = new Keyring({ storage: new Map() })
    const a = k.add({ kind: KINDS.VAULT_KEY, label: 'notes', value: 'sgit_private_vault_x:ab12cd34' })
    const b = k.add({ kind: KINDS.READ_KEY, label: 'notes (read)', value: 'sgit_public_read_' + 'a'.repeat(64) + ':ab12cd34' })
    assert.deepEqual(k.list().map(e => e.id), [b.id, a.id])
    assert.equal(k.list({ kind: KINDS.VAULT_KEY }).length, 1)
    assert.equal(k.update(a.id, { label: 'my notes' }).label, 'my notes')
    assert.ok(k.remove(a.id)); assert.equal(k.get(a.id), null)
})

test('an unknown kind or an empty value is refused', () => {
    const k = new Keyring({ storage: new Map() })
    assert.throws(() => k.add({ kind: 'password', value: 'x' }))
    assert.throws(() => k.add({ kind: KINDS.TRANSFER, value: '' }))
})

test('export then import into another keyring carries every entry once', () => {
    const a = new Keyring({ storage: new Map() }), b = new Keyring({ storage: new Map() })
    a.add({ kind: KINDS.ACCESS_TOKEN, label: 'send.sgraph.ai', value: 'tok', endpoint: 'https://send.sgraph.ai' })
    a.add({ kind: KINDS.TRANSFER, label: 'report.pdf', value: 'abc123def456/' + 'A'.repeat(43) })
    const doc = a.exportJson()
    assert.equal(b.importJson(doc), 2)
    assert.equal(b.importJson(doc), 0)
    assert.equal(b.list({ kind: KINDS.ACCESS_TOKEN })[0].endpoint, 'https://send.sgraph.ai')
    assert.throws(() => b.importJson('not json'))
})

test('a corrupt store reads as empty rather than throwing, and the storage key is stable', () => {
    const m = new Map([[KEY, '{broken']])
    const k = new Keyring({ storage: m })
    assert.deepEqual(k.list(), [])
    k.clear()
    assert.equal(JSON.parse(m.get(KEY)).entries.length, 0)
})
