# Quick start, send a file from a page

> Twelve lines to encrypt a file in the browser, upload it as a transfer, and hand over a link and a QR code; and the two lines that open it.

*Source: <https://api.send.sgit.ai/start/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Quick start: send a file from a page

Three things to have in their places before the first line of code. **The access token** authorises you to upload; it travels in a request header and never in a URL. **The key** lets anyone read; it travels in the link's fragment, after `#`, which a browser never sends to a server. **The file name** travels inside the ciphertext, so the server never sees it. Confuse the first two and nothing throws, which is why this page says it first.

## 1. Pin the release and import it

```html
<script type="module">
  import * as send from 'https://api.send.sgit.ai/v0.1.0/send/send-api.js'
</script>
```

The address names the release. A later release is a different directory; this one does not change. [Hosting and pinning](/docs/hosting/) says how a site's build can check that.

## 2. Send

```js
const api = new send.SendTransfers({ endpoint: 'https://send.sgraph.ai', accessToken: token })   // the token: a header, never a URL
const file = input.files[0]
const r = await api.send({
  bytes:       new Uint8Array(await file.arrayBuffer()),
  filename:    file.name,                 // goes inside the envelope, encrypted
  maxDownloads: 0,                        // 0 is unlimited
  expiresAt:   Date.now() + 7 * 86400e3,  // milliseconds since the epoch; 0 is never
  onProgress:  step => console.log(step)  // wrap, encrypt, create, upload, complete
})
const url = send.link.transferLink({ openUrl: 'https://send.sgit.ai/open/', transferId: r.transferId, key: r.keyString })
qrBox.innerHTML = send.qr.toSvg(url, { title: 'scan to open' })
```

`r.keyString` is the 43-character key. Put it in the link, or hand the link without it (`key: null`) and send the key by a second channel. Never log it: anyone holding it reads the file.

## 3. Open

```js
const parsed = send.link.parseFragment(location.hash)     // { kind: 'transfer', transferId, key } or 'friendly', 'vault-key', 'read-key'
const got = await new send.SendTransfers({ endpoint: 'https://send.sgraph.ai' })
  .receive({ transferId: parsed.transferId, keyString: parsed.key })
saveAs(got.bytes, got.filename)                           // byte for byte what was sent, and the name that never left the browser
```

Opening needs no token: `info` and `download` are public by design, and the key is the gate.

## A friendly token instead of a key

```js
const token = send.friendly.newFriendlyToken()            // "river-cloud-3847"
await api.send({ bytes, filename, friendlyToken: token })
const url = send.link.friendlyLink({ openUrl: 'https://send.sgit.ai/open/', token })
```

One string that can be read out over the phone, and that a QR code carries in a smaller square. Both the transfer id and the key derive from it, so the server never maps a token to anything. There are 1,024,000,000 possible tokens, guessable offline by anyone who has the ciphertext: a friendly token suits a link that expires; a random key suits one that must not be guessed.

## Into a vault instead of a transfer

```js
await send.vault.ready()                                                // loads the vendored library from this release
const sg = send.vault.client({ endpoint: 'https://send.sgraph.ai', accessToken: token })
const { vault, vaultKey, readKey } = await send.vault.createVault(sg, { name: 'Project files' })
await send.vault.writeFiles(vault, [{ folder: '/', name: file.name, data: bytes }])
await send.vault.publish(vault)                                        // compare-and-swap, never push()
keyring.add({ kind: send.KEYRING_KINDS.VAULT_KEY, label: 'Project files', value: vaultKey })   // read and write: stays on this device
shareUrl = send.link.vaultLink({ openUrl: 'https://send.sgit.ai/open/', credential: readKey })  // read only: this one may be shared
```

A vault is versioned, browsable, updatable, and clonable with `sgit clone <read key>`. [The modules](/docs/) have the full surface; [the contracts](/docs/contracts/) have the byte layouts.
