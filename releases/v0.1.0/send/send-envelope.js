/* send-envelope.js, api.send.sgit.ai v0.1.0
 *
 * The SGMETA envelope: the file name (and any other metadata) travels inside the plaintext, so it is encrypted
 * with the file and never reaches the server. The server sees only a content_type_hint the sender chooses.
 *
 *   "SGMETA\0"      7 bytes   53 47 4D 45 54 41 00
 *   meta_len        4 bytes   uint32, big-endian
 *   metadata JSON   meta_len  {"filename": "..."} in UTF-8
 *   file bytes      the rest
 *
 * Wrap before encrypting; unwrap after decrypting. The layout is the one send.sgraph.ai's download page reads
 * (sgit.ai/api/transfers.html), so a transfer made with this module opens there.
 */
import { toBytes } from './send-crypto.js'

export const MAGIC = new Uint8Array([0x53, 0x47, 0x4D, 0x45, 0x54, 0x41, 0x00])   // "SGMETA\0"

export function wrap(meta, bytes) {
    const body    = toBytes(bytes)
    const metaB   = new TextEncoder().encode(JSON.stringify(meta || {}))
    const out     = new Uint8Array(MAGIC.length + 4 + metaB.length + body.length)
    out.set(MAGIC, 0)
    new DataView(out.buffer).setUint32(MAGIC.length, metaB.length, false)
    out.set(metaB, MAGIC.length + 4)
    out.set(body, MAGIC.length + 4 + metaB.length)
    return out
}

export function hasEnvelope(bytes) {
    const b = toBytes(bytes)
    if (b.length < MAGIC.length + 4) return false
    for (let i = 0; i < MAGIC.length; i++) if (b[i] !== MAGIC[i]) return false
    return true
}

/** { meta, bytes }. Bytes without an envelope come back whole with meta {} so an older transfer still opens. */
export function unwrap(bytes) {
    const b = toBytes(bytes)
    if (!hasEnvelope(b)) return { meta: {}, bytes: b, enveloped: false }
    const len = new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(MAGIC.length, false)
    const start = MAGIC.length + 4
    if (start + len > b.length) throw Object.assign(new Error('envelope length runs past the payload'), { code: 'EENVELOPE' })
    let meta
    try { meta = JSON.parse(new TextDecoder().decode(b.subarray(start, start + len))) }
    catch (e) { throw Object.assign(new Error('envelope metadata is not JSON'), { code: 'EENVELOPE', cause: e }) }
    return { meta, bytes: b.subarray(start + len), enveloped: true }
}
