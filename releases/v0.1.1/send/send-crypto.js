/* send-crypto.js, api.send.sgit.ai v0.1.1
 *
 * The one cryptographic primitive every other module uses: AES-256-GCM through the Web Crypto API, with a fresh
 * 12-byte IV in front of the ciphertext and GCM's 16-byte tag after it, exactly as send.sgraph.ai has stored
 * transfers since v0.1.0, so a payload made here opens there and the other way round. Keys travel as unpadded
 * base64url (32 bytes, 43 characters). Nothing here touches the network and nothing is stored.
 *
 * Runs in a browser on a secure context (https or localhost) and in Node 20 or later, where globalThis.crypto
 * is the same API.
 */

export const ALGORITHM  = 'AES-GCM'
export const KEY_BITS   = 256
export const IV_BYTES   = 12
export const TAG_BYTES  = 16
export const OVERHEAD   = IV_BYTES + TAG_BYTES                                 // an encrypted payload is exactly this much larger

const subtle = () => {
    const c = globalThis.crypto
    if (!c || !c.subtle) throw Object.assign(new Error('Web Crypto is not available: this needs a secure context (https or localhost)'), { code: 'ENOCRYPTO' })
    return c.subtle
}

export function randomBytes(n) {
    const out = new Uint8Array(n)
    globalThis.crypto.getRandomValues(out)
    return out
}

export function bytesToBase64url(bytes) {
    let s = ''
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64urlToBytes(str) {
    const s   = String(str || '').replace(/-/g, '+').replace(/_/g, '/')
    const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
    let bin
    try { bin = atob(s + pad) } catch (e) { throw Object.assign(new Error('not base64url'), { code: 'EBASE64', cause: e }) }
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
}

export function bytesToHex(bytes) {
    let s = ''
    for (const b of bytes) s += b.toString(16).padStart(2, '0')
    return s
}

export function toBytes(data) {
    if (data instanceof Uint8Array) return data
    if (data instanceof ArrayBuffer) return new Uint8Array(data)
    if (ArrayBuffer.isView(data)) return new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    if (typeof data === 'string') return new TextEncoder().encode(data)
    throw new TypeError('toBytes: expected bytes or a string')
}

export async function sha256Hex(data) {
    const buf = await subtle().digest('SHA-256', toBytes(data))
    return bytesToHex(new Uint8Array(buf))
}

/** A fresh AES-256-GCM key, extractable so it can be put in a link. */
export async function generateKey() {
    return subtle().generateKey({ name: ALGORITHM, length: KEY_BITS }, true, ['encrypt', 'decrypt'])
}

/** The key as the 43-character string a share link carries. */
export async function exportKey(key) {
    return bytesToBase64url(new Uint8Array(await subtle().exportKey('raw', key)))
}

/** The key back from that string. 32 bytes or it is refused. */
export async function importKey(keyString, usages = ['encrypt', 'decrypt']) {
    let raw
    try { raw = base64urlToBytes(keyString) } catch (e) { throw Object.assign(new Error('a key is 43 base64url characters'), { code: 'EKEY', cause: e }) }
    if (raw.length !== 32) throw Object.assign(new Error(`a key is 32 bytes (43 base64url characters), this one is ${raw.length} bytes`), { code: 'EKEY' })
    return subtle().importKey('raw', raw, { name: ALGORITHM, length: KEY_BITS }, true, usages)
}

export function isKeyString(s) {
    return /^[A-Za-z0-9_-]{43}$/.test(String(s || ''))
}

/** IV || ciphertext || tag, as one Uint8Array. A new IV every call; never reuse one with the same key. */
export async function encryptBytes(key, plaintext) {
    const iv = randomBytes(IV_BYTES)
    const ct = new Uint8Array(await subtle().encrypt({ name: ALGORITHM, iv }, key, toBytes(plaintext)))
    const out = new Uint8Array(iv.length + ct.length)
    out.set(iv, 0)
    out.set(ct, iv.length)
    return out
}

/** The plaintext back, or an error with code EDECRYPT when the key or the bytes are wrong. */
export async function decryptBytes(key, payload) {
    const data = toBytes(payload)
    if (data.length < OVERHEAD) throw Object.assign(new Error('payload is shorter than an IV and a tag'), { code: 'EDECRYPT' })
    const iv = data.subarray(0, IV_BYTES)
    const ct = data.subarray(IV_BYTES)
    try {
        return new Uint8Array(await subtle().decrypt({ name: ALGORITHM, iv }, key, ct))
    } catch (e) {
        throw Object.assign(new Error('decryption failed: wrong key, or the bytes were changed'), { code: 'EDECRYPT', cause: e })
    }
}

/** PBKDF2-HMAC-SHA256 to an AES-256-GCM key: the derivation friendly tokens and simple tokens use. */
export async function deriveKeyPbkdf2(passphrase, salt, iterations = 600000) {
    const enc      = new TextEncoder()
    const material = await subtle().importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
    return subtle().deriveKey({ name: 'PBKDF2', salt: enc.encode(salt), iterations, hash: 'SHA-256' },
                              material, { name: ALGORITHM, length: KEY_BITS }, true, ['encrypt', 'decrypt'])
}
