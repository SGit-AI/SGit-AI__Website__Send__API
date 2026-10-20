/* send-transfers.js, api.send.sgit.ai v0.1.0
 *
 * The transfer client: one encrypted payload, uploaded once, handed over as one link. It speaks to the SG/Send
 * transfer API (https://send.sgraph.ai, or any host that serves the same routes, including the in-memory server in
 * tests/server.mjs) exactly as sgit.ai/api/transfers.html documents it:
 *
 *   POST /api/transfers/create                token    -> { transfer_id }
 *   POST /api/transfers/upload/{id}           token    raw bytes, application/octet-stream
 *   POST /api/transfers/complete/{id}         token    nothing is downloadable before this
 *   GET  /api/transfers/info/{id}             public
 *   GET  /api/transfers/download/{id}         public   the bytes; 410 once expired or exhausted
 *   GET  /api/transfers/download-base64/{id}  public   the same bytes in JSON, for a JSON-only client
 *   DELETE /api/transfers/delete/{id}         token + x-sgraph-transfer-delete-auth
 *
 * Two secrets that must never be confused: the access token authorises *you* to upload and goes in a header, never
 * a URL; the decryption key lets *anyone* read and goes in the link's fragment, never to the server. This module
 * never logs either. The high-level send() and receive() do the whole job: envelope, encrypt, create, upload,
 * complete; download, decrypt, unwrap.
 */
import { generateKey, exportKey, importKey, encryptBytes, decryptBytes, sha256Hex, toBytes, bytesToBase64url, base64urlToBytes } from './send-crypto.js'
import { wrap, unwrap } from './send-envelope.js'
import { deriveKey as friendlyKey, deriveTransferId as friendlyId, isFriendlyToken } from './send-friendly.js'

export const DIRECT_UPLOAD_LIMIT = 4 * 1024 * 1024                              // the working limit for a direct upload; larger needs presigned (PROPOSED here)
export const TOKEN_HEADER        = 'x-sgraph-access-token'
export const DELETE_HEADER       = 'x-sgraph-transfer-delete-auth'

export class TransferError extends Error {
    constructor(code, message, status, detail) { super(message); this.code = code; this.status = status; this.detail = detail }
}

const codeFor = (status) => status === 401 ? 'EAUTH' : status === 403 ? 'EFORBIDDEN' : status === 404 ? 'ENOTFOUND'
                          : status === 410 ? 'EGONE' : status === 413 ? 'ETOOLARGE' : 'EHTTP'

export class SendTransfers {

    constructor({ endpoint, accessToken = '', fetch: f } = {}) {
        if (!endpoint) throw new TypeError('SendTransfers: endpoint is required, for example https://send.sgraph.ai')
        this.endpoint    = String(endpoint).replace(/\/+$/, '')
        this.accessToken = accessToken || ''
        this._fetch      = f || ((...a) => globalThis.fetch(...a))
    }

    _auth() {
        const t = this.accessToken
        if (!t) return {}
        if (!/^[a-z0-9_-]+$/i.test(t)) throw new TransferError('EAUTH', 'the access token has characters a header cannot carry')
        return { [TOKEN_HEADER]: t }
    }

    async _call(method, path, { headers = {}, body, auth = false } = {}) {
        let res
        try { res = await this._fetch(this.endpoint + path, { method, mode: 'cors', headers: { ...(auth ? this._auth() : {}), ...headers }, body }) }
        catch (e) { throw new TransferError('ENETWORK', `could not reach ${this.endpoint}: ${e.message}`, 0, e) }
        if (!res.ok) {
            let detail = ''
            try { detail = await res.text() } catch (e) { /* none */ }
            const html = /^\s*</.test(detail)
            throw new TransferError(html ? 'EEDGE' : codeFor(res.status),
                html ? `the edge answered ${res.status} with an HTML page; the status cannot be trusted` : `${method} ${path} -> ${res.status}`,
                res.status, html ? '' : detail.slice(0, 300))
        }
        return res
    }

    // --- the three calls, and the public reads ------------------------------------------------------------------

    async create({ fileSizeBytes = 0, contentTypeHint = 'application/octet-stream', transferId = null, maxDownloads = 0, autoDelete = true, expiresAt = 0, deleteAuthHash = null } = {}) {
        const body = { file_size_bytes: fileSizeBytes, content_type_hint: contentTypeHint, max_downloads: maxDownloads, auto_delete: autoDelete, expires_at: expiresAt }
        if (transferId)     body.transfer_id      = transferId
        if (deleteAuthHash) body.delete_auth_hash = deleteAuthHash
        const res = await this._call('POST', '/api/transfers/create', { auth: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        return res.json()
    }

    async upload(transferId, bytes) {
        const b = toBytes(bytes)
        if (b.length > DIRECT_UPLOAD_LIMIT) throw new TransferError('ETOOLARGE', `a direct upload is kept under ${DIRECT_UPLOAD_LIMIT} bytes; this payload is ${b.length}. Presigned uploads are not in this release`)
        const res = await this._call('POST', `/api/transfers/upload/${encodeURIComponent(transferId)}`, { auth: true, headers: { 'content-type': 'application/octet-stream' }, body: b })
        return res.json()
    }

    async complete(transferId) {
        const res = await this._call('POST', `/api/transfers/complete/${encodeURIComponent(transferId)}`, { auth: true })
        return res.json()
    }

    async info(transferId) {
        const res = await this._call('GET', `/api/transfers/info/${encodeURIComponent(transferId)}`)
        return res.json()
    }

    async download(transferId) {
        const res = await this._call('GET', `/api/transfers/download/${encodeURIComponent(transferId)}`)
        return new Uint8Array(await res.arrayBuffer())
    }

    async downloadBase64(transferId) {
        const res = await this._call('GET', `/api/transfers/download-base64/${encodeURIComponent(transferId)}`)
        return res.json()
    }

    async remove(transferId, deleteSecret) {
        const res = await this._call('DELETE', `/api/transfers/delete/${encodeURIComponent(transferId)}`, { auth: true, headers: { [DELETE_HEADER]: deleteSecret } })
        return res.json()
    }

    async health() {
        const res = await this._call('GET', '/api/health')
        return res.json()
    }

    // --- the whole job ------------------------------------------------------------------------------------------

    /**
     * Encrypt and upload one file. Returns { transferId, keyString, friendlyToken, encryptedBytes, deleteSecret }.
     *   bytes, filename          the file; the name goes inside the envelope, never to the server
     *   friendlyToken            use a friendly token instead of a random key (the id and the key derive from it)
     *   maxDownloads, expiresAt  0 means unlimited / never; expiresAt is milliseconds since the epoch
     *   revocable                true makes a delete secret, kept by the caller, so the transfer can be deleted later
     *   onProgress               (step) => {} with 'wrap' | 'encrypt' | 'create' | 'upload' | 'complete'
     */
    async send({ bytes, filename = '', contentTypeHint = 'application/octet-stream', friendlyToken = null, maxDownloads = 0, expiresAt = 0, revocable = false, meta = {}, onProgress = () => {} } = {}) {
        onProgress('wrap')
        const plain = wrap({ filename, ...meta }, bytes)
        let key, keyString = null, transferId = null
        if (friendlyToken) {
            if (!isFriendlyToken(friendlyToken)) throw new TransferError('ETOKEN', 'not a friendly token (word-word-1234)')
            key        = await friendlyKey(friendlyToken)
            transferId = await friendlyId(friendlyToken)
        } else {
            key       = await generateKey()
            keyString = await exportKey(key)
        }
        onProgress('encrypt')
        const encrypted = await encryptBytes(key, plain)
        let deleteSecret = null, deleteAuthHash = null
        if (revocable) {
            deleteSecret   = bytesToBase64url(globalThis.crypto.getRandomValues(new Uint8Array(24)))
            deleteAuthHash = await sha256Hex(deleteSecret)
        }
        onProgress('create')
        const created = await this.create({ fileSizeBytes: toBytes(bytes).length, contentTypeHint, transferId, maxDownloads, expiresAt, deleteAuthHash })
        const id = created.transfer_id
        if (!id) throw new TransferError('EPROTOCOL', 'create returned no transfer_id')
        onProgress('upload')
        await this.upload(id, encrypted)
        onProgress('complete')
        await this.complete(id)
        return { transferId: id, keyString, friendlyToken: friendlyToken || null, encryptedBytes: encrypted.length, deleteSecret }
    }

    /** Download and decrypt one transfer from { transferId, key } or { friendlyToken }. Returns { filename, meta, bytes, enveloped }. */
    async receive({ transferId = null, keyString = null, friendlyToken = null, onProgress = () => {} } = {}) {
        let key, id = transferId
        if (friendlyToken) { key = await friendlyKey(friendlyToken); id = await friendlyId(friendlyToken) }
        else {
            if (!keyString) throw new TransferError('EKEY', 'this link carries no key; paste the key that travelled separately')
            key = await importKey(keyString, ['decrypt'])
        }
        onProgress('download')
        const payload = await this.download(id)
        onProgress('decrypt')
        const plain = await decryptBytes(key, payload)
        const { meta, bytes, enveloped } = unwrap(plain)
        return { transferId: id, filename: meta.filename || '', meta, bytes, enveloped }
    }
}

export { base64urlToBytes }
