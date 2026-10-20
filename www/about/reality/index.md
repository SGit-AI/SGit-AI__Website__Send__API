# Reality, what exists

> The code-verified list of what this repository implements, generated from website/data/features.json on every build. If it is not listed here, it does not exist.

*Source: <https://api.send.sgit.ai/about/reality/> · api.send.sgit.ai v0.1.1 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Reality: what exists

Generated from `website/data/features.json` on every build; audited 2026-10-20, v0.1.1, by reading releases/v0.1.1 and running its tests against the code. **If it is not listed here, it does not exist.** Status words: *shipped* (code, tests, served), *proposed* (described in a brief, no code), *absent* (asked about, not built, not planned yet).

## The release

| Feature | Status | Since | Evidence |
|---|---|---|---|
| A release directory that is a complete, independent copy: nothing in it loads from another version or another host | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `releases/v0.1.1/`; `tools/release.py check` fails on a reference outside the directory only by hash, see the note in corrections |
| A manifest with the SHA-256 of every file, recomputed by the gate | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `releases/v0.1.1/manifest.json`, `tools/release.py check` |
| The live host checked file by file after a deploy | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tools/live_check.py`, the verify-live job; not yet run, the host has no DNS yet (see needs) |
| Presigned or multipart uploads for payloads over 4 MB | <span class="sg-status sg-status-proposed">proposed</span> |  | `send-transfers.js` refuses with ETOOLARGE; the server route exists on send.sgraph.ai |

## Crypto and envelope

| Feature | Status | Since | Evidence |
|---|---|---|---|
| AES-256-GCM encrypt and decrypt, IV in front, keys as 43-character base64url | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-crypto.js`, `tests/crypto.test.mjs` |
| The SGMETA envelope: the file name inside the plaintext | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-envelope.js`, `tests/crypto.test.mjs` |
| PBKDF2 derivation (600,000 rounds) for friendly tokens | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-crypto.js` deriveKeyPbkdf2, `tests/link.test.mjs` |
| Interoperability with send.sgraph.ai proved against the live host | <span class="sg-status sg-status-proposed">proposed</span> |  | the formats match the published contracts (sgit.ai/api/transfers); a round trip against send.sgraph.ai needs an access token and has not been run from this repository |

## Tokens and links

| Feature | Status | Since | Evidence |
|---|---|---|---|
| Friendly tokens from the 320-word list, id and key derived as send.sgraph.ai derives them | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-friendly.js`, `send/send-words.js` |
| The link grammar: transfer with key, link only, friendly, vault key, read key; the | truncation | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-link.js`, `tests/link.test.mjs` |
| Credential classification by declared prefix first, shape second | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-link.js` classifyCredential, parseVaultCredential |

## Transfers

| Feature | Status | Since | Evidence |
|---|---|---|---|
| create, upload, complete, info, download, download-base64, delete | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-transfers.js`, `tests/transfers.test.mjs` against `tests/server.mjs` |
| send() and receive(): envelope, encrypt, the three calls; download, decrypt, unwrap | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tests/transfers.test.mjs`: byte-identical round trip, the name never in a request |
| Expiry, download caps, and opt-in revocation with a delete secret | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tests/transfers.test.mjs`: 410 after the cap, 403 then 404 on delete |
| Coded errors: EAUTH, EGONE, ENOTFOUND, EDECRYPT, EKEY, ETOOLARGE, ENETWORK, EEDGE | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-transfers.js` TransferError |

## Vaults

| Feature | Status | Since | Evidence |
|---|---|---|---|
| The vault library v0.2.3 vendored unchanged, twelve files hashed against VENDOR.md | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `vendor/sg-vault/v0.2.3/`, `tests/vault.test.mjs` checks every hash before loading |
| Create a vault, open with a vault key or a read key, write files as commits, read, list, history | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-vault.js`, `tests/vault.test.mjs` |
| Publish with compare-and-swap, merge on ECAS; the lazy-folder trap avoided | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tests/vault.test.mjs`: two clients race, both changes survive |
| Per-device clone branch, made once | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-vault.js` cloneBranch |
| Signed commits and format 2 object ids (sgit 0.19 to 0.21) | <span class="sg-status sg-status-absent">absent</span> |  | the vendored library writes signature: null; a vault that requires signatures must not be written from the browser |
| Vault creation and writes proved against the live host | <span class="sg-status sg-status-proposed">proposed</span> |  | tests run against the in-memory server, which implements the documented routes; a live run needs an access token |

## QR codes

| Feature | Status | Since | Evidence |
|---|---|---|---|
| A link as a QR code, SVG, drawn in the browser, themed with currentColor | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-qr.js`, `tests/qr.test.mjs`; qrcode-generator 2.0.4 vendored and hashed |
| Scanning a QR code with the device camera | <span class="sg-status sg-status-proposed">proposed</span> |  | a phone's camera app opens the link; in-page scanning is not built |

## Keyring

| Feature | Status | Since | Evidence |
|---|---|---|---|
| A per-device keyring in localStorage with a kind on every entry; export and import | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `send/send-keyring.js`, `tests/keyring.test.mjs` |
| Keys at rest encrypted, unlocked by a passkey | <span class="sg-status sg-status-proposed">proposed</span> |  | secrets.sgit.ai's design; this keyring is plaintext in the browser's storage and says so |
| Handing a vault key to a registry over an append lane | <span class="sg-status sg-status-proposed">proposed</span> |  | the flow in sgit.ai/docs/send-a-vault-key; not built here |

## The website and the pipeline

| Feature | Status | Since | Evidence |
|---|---|---|---|
| Every page with a markdown twin, llms.txt, llms-full.txt, sitemap; chrome injected at build | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tools/sitekit.py`, `www/` |
| The gate: build is committed, manifests match, links, twins, origins, tripwire, prose, version | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `tools/check.py`, `.github/workflows/ci.yml` |
| Deploy to GitHub Pages on dev, tag, then verify the live host | <span class="sg-status sg-status-shipped">shipped</span> | v0.1.0 | `.github/workflows/deploy-pages.yml`; the first run waits on Pages and DNS (see needs) |
| A review/ folder with the project as layered graphs | <span class="sg-status sg-status-proposed">proposed</span> |  | `review/intent/` holds the brief as sections; the derived graph and the navigator are not built |

**Counted, not remembered:** 1 absent, 7 proposed, 22 shipped.
