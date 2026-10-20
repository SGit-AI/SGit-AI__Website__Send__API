/* send-api.js, api.send.sgit.ai v0.1.1
 *
 * The one import for a page: every module of this release, re-exported, and the release's own version. A page
 * pins the release by its address and imports from here:
 *
 *   import * as send from 'https://api.send.sgit.ai/v0.1.0/send/send-api.js'
 *
 * Each release directory is a complete, independent copy: nothing in v0.1.0 loads from any other version, and a
 * release is never edited after it is published. A fix is the next release.
 */
export const VERSION = 'v0.1.1'
export const RELEASE = { version: VERSION, date: '2026-10-20', host: 'https://api.send.sgit.ai', path: '/v0.1.1/' }

export * as crypto   from './send-crypto.js'
export * as envelope from './send-envelope.js'
export * as friendly from './send-friendly.js'
export * as link     from './send-link.js'
export * as qr       from './send-qr.js'
export * as vault    from './send-vault.js'
export * as words    from './send-words.js'
export { SendTransfers, TransferError, DIRECT_UPLOAD_LIMIT } from './send-transfers.js'
export { Keyring, KINDS as KEYRING_KINDS }                    from './send-keyring.js'
