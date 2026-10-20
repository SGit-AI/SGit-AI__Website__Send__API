---
title: The modules
description: The ten modules of a release, what each exports, and the error codes a caller is expected to act on.
---

# The modules

One import gives every module as a namespace, plus `VERSION` and `RELEASE`:

```js
import * as send from 'https://api.send.sgit.ai/v0.1.1/send/send-api.js'
send.VERSION                       // 'v0.1.1'
send.crypto, send.envelope, send.friendly, send.words, send.link, send.qr, send.vault
send.SendTransfers, send.TransferError, send.Keyring, send.KEYRING_KINDS
```

Each module can also be imported on its own by its path under `send/`.

## crypto, `send/send-crypto.js`

| Export | What it does |
|---|---|
| `generateKey()` | A fresh AES-256-GCM key, extractable |
| `exportKey(key)`, `importKey(str, usages)` | The key as 43 characters of unpadded base64url, and back; `EKEY` if the length is wrong |
| `encryptBytes(key, bytes)` | `IV (12) || ciphertext || tag (16)`, a fresh IV every call |
| `decryptBytes(key, bytes)` | The plaintext, or `EDECRYPT` |
| `deriveKeyPbkdf2(passphrase, salt, iterations = 600000)` | PBKDF2-HMAC-SHA256 to an AES key |
| `sha256Hex`, `randomBytes`, `bytesToBase64url`, `base64urlToBytes`, `bytesToHex`, `toBytes`, `isKeyString` | Helpers |
| `OVERHEAD` | 28: an encrypted payload is exactly this much larger than its plaintext |

## envelope, `send/send-envelope.js`

`wrap(meta, bytes)` puts `{ filename, ... }` in front of the file under the `SGMETA\0` magic; `unwrap(bytes)` returns `{ meta, bytes, enveloped }`. Bytes without an envelope come back whole with an empty meta, so an older transfer still opens. [The byte layout](/docs/contracts/#envelope).

## friendly, `send/send-friendly.js`

`newFriendlyToken()` makes `word-word-1234` from the 320-word list in `send-words.js`; `isFriendlyToken(s)`; `deriveTransferId(token)` is the first 12 hex of SHA-256; `deriveKey(token)` is PBKDF2 with salt `sgraph-send-v1`. `COMBINATIONS` is 1,024,000,000.

## link, `send/send-link.js`

| Export | What it does |
|---|---|
| `parseFragment(urlOrHash)` | `{ kind }` of `transfer` (with `transferId`, `key` or null), `friendly` (`token`), `vault-key` or `read-key` (`vaultId`, `secret`, `declared`), `empty`, `unknown`. Never throws |
| `transferLink`, `friendlyLink`, `vaultLink` | Build a link on an open page: `{ openUrl, ... }` |
| `classifyCredential(s)` | `vault`, `read-public`, `read-private` or `unknown`, by the declared prefix |
| `parseVaultCredential(s)` | `{ kind: 'vault' or 'read', secret, vaultId, declared }`, prefix first, shape second |
| `publicReadKey(hex, vaultId)`, `privateVaultKey(passphrase, vaultId)` | The prefixed forms |

## transfers, `send/send-transfers.js`

`new SendTransfers({ endpoint, accessToken })`. The three calls `create`, `upload`, `complete`; the public `info`, `download`, `downloadBase64`; `remove(id, deleteSecret)`; `health()`. The whole job: `send({ bytes, filename, friendlyToken, maxDownloads, expiresAt, revocable, onProgress })` returns `{ transferId, keyString, friendlyToken, encryptedBytes, deleteSecret }`; `receive({ transferId, keyString } or { friendlyToken })` returns `{ filename, meta, bytes }`.

Errors are `TransferError` with a `code`:

| Code | When |
|---|---|
| `EAUTH` | 401: no access token, or a wrong one |
| `EFORBIDDEN` | 403: for example a wrong delete secret |
| `ENOTFOUND` | 404: never existed, or deleted. An end state, not a retry |
| `EGONE` | 410: expired or exhausted. Also an end state |
| `ETOOLARGE` | A direct upload over 4 MB, refused before any request; or 413 from the server |
| `EDECRYPT`, `EKEY` | Wrong key; no key where one was needed |
| `ENETWORK` | The host could not be reached |
| `EEDGE` | The edge answered with an HTML page; the status cannot be trusted |

## qr, `send/send-qr.js`

`toSvg(text, { ecc, margin, size, dark, light, title })` returns an SVG string with one path; `toDataUrl(text)` the same for an `<img>`; `modules(text)` the grid; `fits(text, ecc)`. Colours default to `currentColor` on a transparent background, so a code takes the page's theme.

## vault, `send/send-vault.js`

`await ready()` loads the vendored library from this release; `client({ endpoint, accessToken })`; `createVault(sg, { name })` returns `{ vault, vaultId, vaultKey, readKey }`; `openVault(sg, vaultKey)` (a read key opens read-only); `openReadOnly(sg, readKey)`; `writeFile`, `writeFiles` (one commit for many files), `readFile`, `readText`, `listFolder`, `listAll`, `history`; `publish(vault)` with compare-and-swap and a merge on `ECAS`; `readKeyOf(vault)`; `randomPassphrase()`; `cloneBranch()`. Every folder is loaded before a write into it, which is the trap the sgit.ai page records.

## keyring, `send/send-keyring.js`

`new Keyring({ storage })`, `KINDS` (`sgit-vault-key`, `sgit-read-key`, `send-transfer`, `send-access-token`), `list({ kind })`, `get`, `add({ kind, label, value, ...meta })`, `update`, `remove`, `clear`, `exportJson()`, `importJson(text)`. One JSON document under `send.sgit.ai.keyring.v1` in the page's localStorage, plaintext at rest, per device.

## words, `send/send-words.js`

`WORDS`, frozen, 320 entries; `WORD_COUNT`; `COMBINATIONS`. The list send.sgraph.ai has used since v0.2.6, so a token made by either site opens on the other.
