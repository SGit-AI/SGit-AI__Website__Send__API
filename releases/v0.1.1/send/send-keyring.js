/* send-keyring.js, api.send.sgit.ai v0.1.1
 *
 * The keyring: where a browser keeps the keys this site makes, so a vault created on Tuesday can be opened on
 * Thursday and a transfer sent this morning can be revoked this afternoon. It is one JSON document in the page's
 * own localStorage under KEY, with a kind on every entry so a vault key is never confused with a read key:
 *
 *   sgit-vault-key     read and write; never leaves this browser except by an export the person asks for
 *   sgit-read-key      read only; the one that may be published
 *   send-transfer      a transfer this browser sent: id, key or token, delete secret, filename, when
 *   send-access-token  the access token for one API host
 *
 * What this is and is not. It is per device and per origin: there is no account and nothing is uploaded. It is
 * plaintext at rest in the browser's storage, so anyone with the device and the profile can read it; the passkey-
 * unlocked keyring at secrets.sgit.ai and a password manager are the stronger homes, and export() produces the
 * document to move entries there. Pass a Map-like storage to use it outside a browser (the tests do).
 */
export const KEY   = 'send.sgit.ai.keyring.v1'
export const KINDS = Object.freeze({ VAULT_KEY: 'sgit-vault-key', READ_KEY: 'sgit-read-key', TRANSFER: 'send-transfer', ACCESS_TOKEN: 'send-access-token' })
const ALL = new Set(Object.values(KINDS))

export class Keyring {

    constructor({ storage = null } = {}) {
        this.storage = storage || (typeof localStorage !== 'undefined' ? localStorage : new Map())
    }

    _read() {
        let raw = null
        try { raw = typeof this.storage.getItem === 'function' ? this.storage.getItem(KEY) : this.storage.get(KEY) } catch (e) { raw = null }
        if (!raw) return { version: 1, entries: [] }
        try { const d = JSON.parse(raw); return Array.isArray(d.entries) ? d : { version: 1, entries: [] } } catch (e) { return { version: 1, entries: [] } }
    }

    _write(doc) {
        const s = JSON.stringify(doc)
        if (typeof this.storage.setItem === 'function') this.storage.setItem(KEY, s); else this.storage.set(KEY, s)
    }

    list({ kind = null } = {}) {
        return this._read().entries.filter(e => !kind || e.kind === kind)
    }

    get(id) {
        return this._read().entries.find(e => e.id === id) || null
    }

    /** Add one entry. { kind, label, value, ...meta }. Returns the entry with its id and created time. */
    add({ kind, label = '', value, ...meta }) {
        if (!ALL.has(kind)) throw new TypeError(`keyring: unknown kind ${kind}`)
        if (!value) throw new TypeError('keyring: value is required')
        const doc = this._read()
        const id  = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
        const entry = { id, kind, label, value, created: new Date().toISOString(), ...meta }
        doc.entries.unshift(entry)
        this._write(doc)
        return entry
    }

    update(id, patch) {
        const doc = this._read()
        const e = doc.entries.find(x => x.id === id)
        if (!e) return null
        Object.assign(e, patch, { updated: new Date().toISOString() })
        this._write(doc)
        return e
    }

    remove(id) {
        const doc = this._read()
        const n = doc.entries.length
        doc.entries = doc.entries.filter(e => e.id !== id)
        this._write(doc)
        return doc.entries.length < n
    }

    clear() { this._write({ version: 1, entries: [] }) }

    /** The whole keyring as a JSON document the person can save or move to a password manager. Contains secrets. */
    exportJson() {
        return JSON.stringify({ ...this._read(), exported: new Date().toISOString(), origin: typeof location !== 'undefined' ? location.origin : '' }, null, 2)
    }

    /** Merge an exported document in; entries with an id already present are skipped. Returns how many were added. */
    importJson(text) {
        let d
        try { d = JSON.parse(text) } catch (e) { throw new TypeError('keyring: not JSON') }
        if (!d || !Array.isArray(d.entries)) throw new TypeError('keyring: no entries')
        const doc = this._read()
        const have = new Set(doc.entries.map(e => e.id))
        let n = 0
        for (const e of d.entries) {
            if (!e || !ALL.has(e.kind) || !e.value || have.has(e.id)) continue
            doc.entries.push({ ...e, id: e.id || ('k' + Math.random().toString(36).slice(2, 10)) }); n++
        }
        this._write(doc)
        return n
    }
}
