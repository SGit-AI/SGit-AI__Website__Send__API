/* send-vault.js, api.send.sgit.ai v0.1.0
 *
 * Files in a vault instead of a one-shot transfer: versioned, browsable, updatable, clonable with sgit. This is a
 * thin layer over the vendored vault library (vendor/sg-vault/v0.2.3, the twelve files that run dev.vault.sgraph.ai,
 * copied unchanged and hashed), following sgit.ai/docs/vault/vault-from-javascript.html line by line: one code
 * base, load the folder before writing into it, publish with compare-and-swap and never with push().
 *
 * The library is classic scripts that declare globals (SGSend, SGVault, SGVaultCrypto, SGSendCrypto). In a browser,
 * ready() injects them in order from this release's own vendor path; in Node the test loads them into the realm first
 * and ready() finds them already there.
 */
import { bytesToHex, randomBytes } from './send-crypto.js'
import { privateVaultKey, publicReadKey, stripPrefix, parseVaultCredential } from './send-link.js'

export const LIBRARY_VERSION = 'v0.2.3'
export const LIBRARY_FILES = Object.freeze([
    'sg-send/sg-send-crypto.js', 'sg-send/sg-send.js',
    'sg-vault/sg-vault-crypto.js', 'sg-vault/sg-vault-object-store.js', 'sg-vault/sg-vault-ref-manager.js',
    'sg-vault/sg-vault-commit.js', 'sg-vault/sg-vault.js', 'sg-vault/sg-vault--file-ops.js',
    'sg-vault/sg-vault--folder-ops.js', 'sg-vault/sg-vault--sync.js', 'sg-vault/sg-vault--history.js', 'sg-vault/sg-vault--branches.js',
])
export const CLONE_BRANCH_KEY = 'send.sgit.ai.clone-branch'

let loading = null

const lib = () => {
    const g = globalThis
    if (!g.SGVault || !g.SGSend || !g.SGVaultCrypto) throw Object.assign(new Error('the vault library is not loaded; await vault.ready() first'), { code: 'ENOLIB' })
    return g
}

/** Load the library once, from this release's own files. Resolves to the globals. */
export function ready() {
    if (globalThis.SGVault && globalThis.SGSend && globalThis.SGVaultCrypto) return Promise.resolve(lib())
    if (loading) return loading
    if (typeof document === 'undefined') return Promise.reject(Object.assign(new Error('no document: load the twelve library files into the realm before calling ready()'), { code: 'ENOLIB' }))
    loading = (async () => {
        const urls = [...LIBRARY_FILES.map(f => new URL(`../vendor/sg-vault/${LIBRARY_VERSION}/${f}`, import.meta.url).href),
                      new URL('./send-vault-expose.js', import.meta.url).href]          // the classes as globalThis properties, see that file
        for (const f of urls) {
            await new Promise((resolve, reject) => {
                const s = document.createElement('script')
                s.src = f
                s.async = false
                s.onload = resolve
                s.onerror = () => reject(Object.assign(new Error(`could not load ${f}`), { code: 'ENOLIB' }))
                document.head.appendChild(s)
            })
        }
        return lib()
    })()
    return loading
}

/** The HTTP client the library uses. The access token is needed for every write and for creating a vault. */
export function client({ endpoint, accessToken = '' }) {
    const { SGSend } = lib()
    return new SGSend({ endpoint: String(endpoint).replace(/\/+$/, ''), token: accessToken })
}

/** 24 characters of [a-z0-9] from the CSPRNG, the shape sgit init makes, with rejection sampling. */
export function randomPassphrase(n = 24) {
    const abc = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const out = []
    while (out.length < n) for (const b of randomBytes(n)) if (b < 252 && out.length < n) out.push(abc[b % 36])
    return out.join('')
}

/** This browser's own clone branch, made once and kept in localStorage, so two devices never share a working ref. */
export function cloneBranch(storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
    let id = null
    try { id = storage && storage.getItem(CLONE_BRANCH_KEY) } catch (e) { id = null }
    if (!id) {
        id = 'send-' + bytesToHex(randomBytes(4))
        try { storage && storage.setItem(CLONE_BRANCH_KEY, id) } catch (e) { /* no storage */ }
    }
    return id
}

/** Create a vault: one batch write, needs the access token. Returns { vault, vaultId, vaultKey, readKey }. */
export async function createVault(sgSend, { name = 'send.sgit.ai vault', description = '', passphrase = randomPassphrase() } = {}) {
    const { SGVault } = lib()
    const vault = await SGVault.create(sgSend, passphrase, { name, description })
    return { vault, vaultId: vault.vaultId, vaultKey: privateVaultKey(passphrase, vault.vaultId), readKey: await readKeyOf(vault) }
}

/** Open with a vault key (prefixed or bare), on this device's clone branch. */
export async function openVault(sgSend, vaultKey, { cloneBranch: branch = cloneBranch() } = {}) {
    const { SGVault } = lib()
    const cred = parseVaultCredential(vaultKey)
    if (!cred) throw Object.assign(new Error('not a vault credential'), { code: 'EKEY' })
    if (cred.kind === 'read') return openReadOnly(sgSend, vaultKey)
    return SGVault.open(sgSend, stripPrefix(vaultKey), { cloneBranch: branch })
}

/** Open with a read key: decrypts everything, writes nothing. */
export async function openReadOnly(sgSend, readKey) {
    const { SGVault, SGVaultCrypto } = lib()
    const cred = SGVaultCrypto.parseReadOnlyCredential(readKey)
    if (!cred) throw Object.assign(new Error('not a read key (64 hex characters, a colon, the vault id)'), { code: 'EKEY' })
    const c = await SGVaultCrypto.deriveReadOnlyCreds(cred.vaultId, cred.readKeyHex)
    return SGVault.openReadOnly(sgSend, c.vaultId, c.readKeyB64, c.refFileId)
}

/** The public read key of an open, writable vault: the credential a page may print. */
export async function readKeyOf(vault) {
    const raw = await vault.readKeyRawBytes()
    if (!raw) return null
    return publicReadKey(bytesToHex(raw), vault.vaultId)
}

/** Load every folder on a path; sub-folders are placeholders after open, and a write into one is silently lost. */
export async function ensureLoaded(vault, folder) {
    let path = ''
    for (const part of String(folder).split('/').filter(Boolean)) {
        path += '/' + part
        if (vault.needsLoading(path)) await vault.loadSubTreeOnDemand(path)
    }
}

async function ensureFolder(vault, folder) {
    await ensureLoaded(vault, folder)
    let path = ''
    for (const part of String(folder).split('/').filter(Boolean)) {
        path += '/' + part
        if (!vault.listFolder(path)) await vault.createFolder(path)
    }
}

const asBytes = d => typeof d === 'string' ? new TextEncoder().encode(d) : (d instanceof ArrayBuffer ? new Uint8Array(d) : d)

/** Write one file: one commit. Creates missing folders; updates when the name exists. */
export async function writeFile(vault, folder, name, data) {
    await ensureFolder(vault, folder)
    const exists = (vault.listFolder(folder) || []).some(e => e.name === name && e.type === 'file')
    return exists ? vault.updateFile(folder, name, asBytes(data)) : vault.addFile(folder, name, asBytes(data))
}

/** Write many files as one commit: [{ folder, name, data }]. Names that exist are updated one by one after. */
export async function writeFiles(vault, files) {
    const fresh = [], updates = []
    for (const f of files) {
        await ensureFolder(vault, f.folder)
        const exists = (vault.listFolder(f.folder) || []).some(e => e.name === f.name && e.type === 'file')
        ;(exists ? updates : fresh).push(f)
    }
    if (fresh.length) await vault.addFiles(fresh.map(f => ({ folderPath: f.folder, fileName: f.name, fileData: asBytes(f.data) })))
    for (const f of updates) await vault.updateFile(f.folder, f.name, asBytes(f.data))
    return { added: fresh.length, updated: updates.length }
}

export async function readFile(vault, folder, name) {
    await ensureLoaded(vault, folder)
    return vault.getFile(folder, name)
}

export async function readText(vault, folder, name) {
    return new TextDecoder().decode(await readFile(vault, folder, name))
}

export async function listFolder(vault, folder = '/') {
    await ensureLoaded(vault, folder)
    return vault.listFolder(folder) || []
}

/** Every file in the vault as { folder, name, size }, walking the tree on demand. */
export async function listAll(vault, folder = '/', out = []) {
    for (const e of await listFolder(vault, folder)) {
        const path = folder === '/' ? '/' + e.name : folder + '/' + e.name
        if (e.type === 'folder') await listAll(vault, path, out)
        else out.push({ folder, name: e.name, size: e.size, path })
    }
    return out
}

/** Publish with compare-and-swap: pushIfMatch, and on ECAS merge what the other side published and try once more. */
export async function publish(vault) {
    if (vault._refManager.lastRawRef(vault._refFileId) === undefined) await vault.getBehindCount()   // only if never read: arms the compare-and-swap
    try { await vault.pushIfMatch(); return { merged: false } }
    catch (e) { if (e.code !== 'ECAS') throw e }
    const theirs = await vault._refManager.readRef(vault._refFileId)
    const r = await vault.merge(theirs, { publish: false })
    if (r.conflicts && r.conflicts.length) throw Object.assign(new Error('conflicts: ' + r.conflicts.join(', ')), { code: 'ECONFLICT', conflicts: r.conflicts })
    await vault.pushIfMatch()
    return { merged: true }
}

export async function history(vault, { limit = 50 } = {}) {
    return vault.logCommits({ limit })
}
