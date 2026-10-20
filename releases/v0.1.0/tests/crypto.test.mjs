import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as c from '../send/send-crypto.js'
import * as env from '../send/send-envelope.js'

test('a key is 32 bytes and 43 base64url characters, and round-trips', async () => {
    const key = await c.generateKey()
    const s = await c.exportKey(key)
    assert.equal(s.length, 43)
    assert.ok(c.isKeyString(s))
    const back = await c.importKey(s)
    assert.equal(await c.exportKey(back), s)
})

test('encrypt then decrypt is the identity, and the payload is exactly 28 bytes larger', async () => {
    const key = await c.generateKey()
    const plain = new TextEncoder().encode('hello, vault')
    const ct = await c.encryptBytes(key, plain)
    assert.equal(ct.length, plain.length + c.OVERHEAD)
    assert.deepEqual(await c.decryptBytes(key, ct), plain)
})

test('two encryptions of the same bytes differ (a fresh IV every time)', async () => {
    const key = await c.generateKey()
    const a = await c.encryptBytes(key, 'same'), b = await c.encryptBytes(key, 'same')
    assert.notDeepEqual(a, b)
})

test('the wrong key fails with EDECRYPT, not with garbage', async () => {
    const ct = await c.encryptBytes(await c.generateKey(), 'secret')
    await assert.rejects(c.decryptBytes(await c.generateKey(), ct), e => e.code === 'EDECRYPT')
})

test('a key string of the wrong length is refused with EKEY', async () => {
    await assert.rejects(c.importKey('short'), e => e.code === 'EKEY')
})

test('base64url and hex helpers are exact', () => {
    const bytes = new Uint8Array([0, 1, 250, 251, 252, 253, 254, 255])
    assert.deepEqual(c.base64urlToBytes(c.bytesToBase64url(bytes)), bytes)
    assert.equal(c.bytesToHex(bytes), '0001fafbfcfdfeff')
})

test('sha256Hex matches a published vector', async () => {
    assert.equal(await c.sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('the SGMETA envelope keeps the file name inside the plaintext and unwraps byte for byte', () => {
    const body = new Uint8Array([1, 2, 3, 4])
    const wrapped = env.wrap({ filename: 'notes.md' }, body)
    assert.deepEqual(wrapped.subarray(0, 7), env.MAGIC)
    assert.equal(new DataView(wrapped.buffer).getUint32(7, false), JSON.stringify({ filename: 'notes.md' }).length)
    const { meta, bytes, enveloped } = env.unwrap(wrapped)
    assert.equal(enveloped, true)
    assert.equal(meta.filename, 'notes.md')
    assert.deepEqual(bytes, body)
})

test('bytes without an envelope come back whole, with an empty meta', () => {
    const r = env.unwrap(new Uint8Array([9, 9, 9]))
    assert.equal(r.enveloped, false)
    assert.deepEqual(r.bytes, new Uint8Array([9, 9, 9]))
})

test('a corrupt envelope length is EENVELOPE', () => {
    const w = env.wrap({ filename: 'x' }, 'body')
    new DataView(w.buffer).setUint32(7, 9999, false)
    assert.throws(() => env.unwrap(w), e => e.code === 'EENVELOPE')
})
