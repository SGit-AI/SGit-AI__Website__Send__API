# api.send.sgit.ai, release v0.1.1

The first release: the client-side code that send.sgit.ai runs, published as one directory that is never edited
after it is on the default branch. A page pins it by its address and imports one module:

```html
<script type="module">
  import * as send from 'https://api.send.sgit.ai/v0.1.1/send/send-api.js'
</script>
```

| Module | What it is |
|---|---|
| `send/send-api.js` | The index: every module below, re-exported, and `VERSION` |
| `send/send-crypto.js` | AES-256-GCM through Web Crypto, keys as 43-character base64url, PBKDF2 |
| `send/send-envelope.js` | The SGMETA envelope: the file name inside the plaintext, never on the server |
| `send/send-friendly.js` | Friendly tokens, `river-cloud-3847`: the id and the key both derived from one string |
| `send/send-words.js` | The 320 words a friendly token is made of, as send.sgraph.ai ships them |
| `send/send-link.js` | The link grammar: transfer, link-only, friendly, vault key, read key; parse and build |
| `send/send-transfers.js` | The transfer client: create, upload, complete, info, download, delete; `send()` and `receive()` |
| `send/send-qr.js` | A link as a QR code, as SVG, drawn in the browser |
| `send/send-vault.js` | Files in a vault: create, open, write, publish with compare-and-swap, read key to share |
| `send/send-keyring.js` | The per-device keyring in localStorage, with a kind on every entry |
| `vendor/sg-vault/v0.2.3/` | The vault library that runs dev.vault.sgraph.ai, twelve files copied unchanged and hashed |
| `vendor/qrcode-generator/2.0.4/` | The QR encoder (Kazuhiko Arase, MIT), unchanged and hashed |
| `tests/` | The tests, co-located: `node --test 'tests/*.test.mjs'`; `tests/server.mjs` is the API in memory |

`manifest.json` lists every file with its size and SHA-256; `python3 tools/release.py check` recomputes them and fails
when the tree is not the release it names. Nothing here loads from any other release directory or from any other host.

Code Apache-2.0; the vendored files keep their own licences, in their own folders.
