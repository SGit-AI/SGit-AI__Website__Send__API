/* send-link.js, api.send.sgit.ai v0.1.0
 *
 * The share link grammar. Everything that identifies or unlocks a thing travels in the URL fragment, after "#",
 * which a browser never sends to the server that serves the page. Four shapes are recognised:
 *
 *   #<transfer_id>/<key>      a transfer, with its 43-character key: the link is the whole credential
 *   #<transfer_id>            a transfer, link only: the key travels by a second channel
 *   #<word-word-1234>         a friendly token: one string derives the transfer id and the key
 *   #<credential>:<vault_id>  a vault: a vault key (read and write) or a read key (read only), prefixed or bare
 *
 * Parsing rules, the ones send.sgraph.ai's download page has: split on the first "/", and truncate at "|", which is
 * reserved. A vault key is told from a read key by its declared prefix first and by its shape second (64 hex
 * characters before the colon is a read key; anything else is a passphrase, which is write access).
 */
import { isFriendlyToken } from './send-friendly.js'
import { isKeyString } from './send-crypto.js'

export const PREFIX_VAULT       = 'sgit_private_vault_'
export const PREFIX_READ_PUBLIC = 'sgit_public_read_'
export const PREFIX_READ_PRIV   = 'sgit_private_read_'
export const PREFIXES           = [PREFIX_VAULT, PREFIX_READ_PRIV, PREFIX_READ_PUBLIC, 'sgit_vk1_', 'sgit_rk1_']
export const RE_TRANSFER_ID     = /^[a-z0-9]{8,32}$/i
export const RE_VAULT_ID        = /^[a-z0-9]{4,24}$/

export function stripPrefix(s) {
    const t = String(s || '').trim()
    for (const p of PREFIXES) if (t.startsWith(p)) return t.slice(p.length)
    return t
}

/** 'vault' | 'read-public' | 'read-private' | 'unknown': what the credential declares, never what it looks like. */
export function classifyCredential(s) {
    const t = String(s || '').trim()
    if (t.startsWith(PREFIX_READ_PUBLIC))                                  return 'read-public'
    if (t.startsWith(PREFIX_READ_PRIV) || t.startsWith('sgit_rk1_'))       return 'read-private'
    if (t.startsWith(PREFIX_VAULT)     || t.startsWith('sgit_vk1_'))       return 'vault'
    return 'unknown'
}

/** { kind: 'vault' | 'read', secret, vaultId, declared, credential } or null when it is not a vault credential. */
export function parseVaultCredential(s) {
    const raw  = String(s || '').trim()
    const bare = stripPrefix(raw)
    const i    = bare.lastIndexOf(':')
    if (i <= 0) return null
    const secret = bare.slice(0, i), vaultId = bare.slice(i + 1)
    if (!RE_VAULT_ID.test(vaultId) || !secret) return null
    const declared = classifyCredential(raw)
    const kind = declared === 'vault' ? 'vault'
               : declared.startsWith('read') ? 'read'
               : (/^[a-f0-9]{64}$/.test(secret) ? 'read' : 'vault')          // the shape, only when nothing was declared
    return { kind, secret, vaultId, declared, credential: raw }
}

/** The fragment of a URL or a bare hash, parsed. Never throws: unknown shapes come back as { kind: 'unknown' }. */
export function parseFragment(input) {
    let h = String(input || '')
    const at = h.indexOf('#')
    if (at >= 0) h = h.slice(at + 1)
    try { h = decodeURIComponent(h) } catch (e) { /* keep as is */ }
    h = h.trim()
    const bar = h.indexOf('|')
    if (bar >= 0) h = h.slice(0, bar)
    if (!h) return { kind: 'empty' }
    if (isFriendlyToken(h)) return { kind: 'friendly', token: h }
    const vault = parseVaultCredential(h)
    if (vault) return { ...vault, kind: vault.kind === 'vault' ? 'vault-key' : 'read-key' }
    const slash = h.indexOf('/')
    const id  = slash >= 0 ? h.slice(0, slash) : h
    const key = slash >= 0 ? h.slice(slash + 1) : ''
    if (RE_TRANSFER_ID.test(id) && (!key || isKeyString(key))) return { kind: 'transfer', transferId: id, key: key || null }
    return { kind: 'unknown', raw: h }
}

const base = (b) => String(b || '').replace(/[#?].*$/, '').replace(/\/?$/, '/')

/** The link for a transfer: with its key, or link only. */
export function transferLink({ openUrl, transferId, key = null }) {
    if (!RE_TRANSFER_ID.test(transferId || '')) throw new TypeError('transferLink: transferId')
    return `${base(openUrl)}#${transferId}${key ? '/' + key : ''}`
}

/** The link for a friendly token. */
export function friendlyLink({ openUrl, token }) {
    if (!isFriendlyToken(token)) throw new TypeError('friendlyLink: not a friendly token')
    return `${base(openUrl)}#${token}`
}

/** The link for a vault credential: pass a read key to share reading, never a vault key on a page. */
export function vaultLink({ openUrl, credential }) {
    if (!parseVaultCredential(credential)) throw new TypeError('vaultLink: not a vault credential')
    return `${base(openUrl)}#${String(credential).trim()}`
}

/** The read key with the public prefix, as a page may print it. */
export function publicReadKey(readKeyHex, vaultId) {
    if (!/^[a-f0-9]{64}$/.test(readKeyHex) || !RE_VAULT_ID.test(vaultId)) throw new TypeError('publicReadKey')
    return `${PREFIX_READ_PUBLIC}${readKeyHex}:${vaultId}`
}

/** The vault key with the private prefix, as sgit prints it. Never put this in a page, a repository or a log. */
export function privateVaultKey(passphrase, vaultId) {
    if (!passphrase || !RE_VAULT_ID.test(vaultId)) throw new TypeError('privateVaultKey')
    return `${PREFIX_VAULT}${passphrase}:${vaultId}`
}
