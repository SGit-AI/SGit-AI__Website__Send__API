# Contracts, the formats that must not drift

> The byte layouts and string grammars this release shares with send.sgraph.ai and with sgit, each with where it came from and the test that holds it.

*Source: <https://api.send.sgit.ai/docs/contracts/> · api.send.sgit.ai v0.1.1 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Contracts: links, envelope, tokens, keys

These are the parts that have to match on both ends: a sender on one site, a reader on another, a CLI on a laptop. Each one names its source and the test that holds it. A change to any of them is a new major version of this API and a conversation with the owners of the other end.

## The ciphertext {#ciphertext}

```
IV                 12 bytes    random, fresh per encryption, prepended
ciphertext + tag   rest        AES-256-GCM; GCM appends its own 16-byte tag
```

Exactly what `crypto.subtle.encrypt` returns with the IV in front, so a payload is 28 bytes larger than its plaintext. The key is 32 random bytes, shared as unpadded base64url, 43 characters. Source: send.sgraph.ai since v0.1.1, documented at [sgit.ai/api/transfers](https://sgit.ai/api/transfers.html). Held by `tests/crypto.test.mjs`.

## The envelope {#envelope}

```
"SGMETA\0"       7 bytes    53 47 4D 45 54 41 00
meta_len         4 bytes    uint32, big-endian
metadata JSON    meta_len   {"filename": "..."} UTF-8
file bytes       rest
```

Wrapped before encrypting, so the name is inside the ciphertext. Getting the order wrong produces a corrupt download with no name. Held by `tests/crypto.test.mjs` (magic, length, round trip) and `tests/transfers.test.mjs` (the name appears in no request and not in the stored bytes).

## Friendly tokens {#friendly}

| | |
|---|---|
| Shape | `word-word-DDDD`, two words from the 320-word list and four digits, `/^[a-z]+-[a-z]+-\d{4}$/` |
| Transfer id | the first 12 hex characters of `SHA-256(token)` |
| Key | `PBKDF2-HMAC-SHA256(token, salt "sgraph-send-v1", 600000)`, 256 bits |
| Create | the client sends `transfer_id` in the create body; the server refuses an id that exists |

Source: send.sgraph.ai `friendly-crypto.js` and `V026_WORDS`. Held by `tests/link.test.mjs` (the id computed independently) and `tests/transfers.test.mjs` (a token used twice is refused).

## Links {#links}

The fragment, after `#`, split on the first `/`, truncated at `|`:

| Fragment | Means |
|---|---|
| `<transfer_id>/<key>` | a transfer and its 43-character key |
| `<transfer_id>` | link only; the key travels by another channel |
| `<word-word-1234>` | a friendly token |
| `<prefix><secret>:<vault_id>` | a vault credential; the prefix declares which |

`transfer_id` is `/^[a-z0-9]{8,32}$/i`; `vault_id` is `/^[a-z0-9]{4,24}$/`. Source: send.sgraph.ai's download page and sgit.ai's credentials page. Held by `tests/link.test.mjs`.

## Vault credentials {#credentials}

| Prefix | Declares | May be published |
|---|---|---|
| `sgit_private_vault_` | a vault key, read and write | never |
| `sgit_private_read_` | a read key kept private | no; re-derive under the public prefix first |
| `sgit_public_read_` | a read key, deliberately published | yes |
| `sgit_vk1_`, `sgit_rk1_` | legacy forms, accepted, never emitted | as above |

Classification is by declaration first and shape second: a bare `<64 hex>:<id>` reads as a read key, anything else before the colon is a passphrase, which is write access. Source: [sgit.ai/docs/credentials](https://sgit.ai/docs/credentials.html) and the vendored `SGVaultCrypto.classifyKey`. Held by `tests/link.test.mjs`.

## The vault objects {#vault}

The vendored library owns this contract and this release does not restate it: read key and write key derived by PBKDF2 from the passphrase and the vault id, `obj-cas-imm-` content-addressed objects, `ref-pid-muw-` refs, one `POST /batch` per commit, compare-and-swap on publish. [Creating and writing a vault from JavaScript](https://sgit.ai/docs/vault/vault-from-javascript.html) is the reference; `tests/vault.test.mjs` proves create, write, publish, race and reopen against the in-memory server, and the hashes of the twelve files before any of it.

## The keyring document {#keyring}

```json
{ "version": 1, "entries": [ { "id", "kind", "label", "value", "created", ...meta } ] }
```

`kind` is one of `sgit-vault-key`, `sgit-read-key`, `send-transfer`, `send-access-token`. The document is this release's own format; `exportJson()` adds `exported` and `origin`. Held by `tests/keyring.test.mjs`.
