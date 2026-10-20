/* send-friendly.js, api.send.sgit.ai v0.1.0
 *
 * Friendly tokens: "river-cloud-3847". One short string that is the whole credential for one transfer, easy to
 * read out, to type, or to carry in a QR code. From the token both sides derive the same two things, so the server
 * never maps a token to anything and never sees the token:
 *
 *   transfer id   = first 12 hex characters of SHA-256(token)
 *   AES-256 key   = PBKDF2-HMAC-SHA256(token, salt "sgraph-send-v1", 600,000 iterations)
 *
 * These are the derivations send.sgraph.ai has used since v0.2.6 (its friendly-crypto.js), kept byte for byte so a
 * token made by either site opens on the other. The token's strength is the list: 1,024,000,000 possible tokens,
 * guessable offline by anyone who has the ciphertext, which is why a friendly token suits a link that expires and a
 * random key suits one that must not be guessed. Say which you are choosing; the site does.
 */
import { WORDS, COMBINATIONS } from './send-words.js'
import { sha256Hex, deriveKeyPbkdf2, randomBytes } from './send-crypto.js'

export const SALT       = 'sgraph-send-v1'
export const ITERATIONS = 600000
export const PATTERN    = /^[a-z]+-[a-z]+-\d{4}$/
export { COMBINATIONS }

export function isFriendlyToken(s) {
    return PATTERN.test(String(s || '').trim())
}

function pick() {                                                                 // rejection sampling: no modulo bias
    const limit = Math.floor(65536 / WORDS.length) * WORDS.length
    for (;;) {
        const b = randomBytes(2)
        const n = (b[0] << 8) | b[1]
        if (n < limit) return WORDS[n % WORDS.length]
    }
}

function digits() {
    const limit = Math.floor(65536 / 10000) * 10000
    for (;;) {
        const b = randomBytes(2)
        const n = (b[0] << 8) | b[1]
        if (n < limit) return String(n % 10000).padStart(4, '0')
    }
}

/** A new token: two random words and four random digits, from the browser's CSPRNG. */
export function newFriendlyToken() {
    return `${pick()}-${pick()}-${digits()}`
}

/** The transfer id a token addresses: SHA-256(token), first 12 hex characters. */
export async function deriveTransferId(token) {
    return (await sha256Hex(String(token).trim())).slice(0, 12)
}

/** The AES-256-GCM key a token unlocks. About a second on a laptop: 600,000 PBKDF2 rounds. */
export async function deriveKey(token) {
    return deriveKeyPbkdf2(String(token).trim(), SALT, ITERATIONS)
}
