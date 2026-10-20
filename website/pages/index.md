---
title: api.send.sgit.ai, the client-side API behind send.sgit.ai
description: Encrypt, envelope, transfer, vault, QR and keyring modules, published as independent, versioned, never-edited releases a page pins by address. No server, nothing to deploy but files.
---

# The API behind send.sgit.ai, as files a page pins

<p class="sg-lead">Everything <a href="https://send.sgit.ai">send.sgit.ai</a> does in the browser lives here: encrypting a file, keeping its name inside the ciphertext, uploading it as one transfer or committing it into a vault, turning the link into a QR code, and remembering the keys on the device. It is published at a versioned address, <code>/v0.1.1/</code>, that is never edited once it is on the default branch, with a manifest of the SHA-256 of every file. Any page, on any site, can import it.</p>

```html
<script type="module">
  import * as send from 'https://api.send.sgit.ai/v0.1.1/send/send-api.js'
  const api = new send.SendTransfers({ endpoint: 'https://send.sgraph.ai', accessToken })
  const r   = await api.send({ bytes, filename: 'report.pdf' })
  const url = send.link.transferLink({ openUrl: 'https://send.sgit.ai/open/', transferId: r.transferId, key: r.keyString })
  document.querySelector('#qr').innerHTML = send.qr.toSvg(url)
</script>
```

<div class="cards">
<div class="card"><h3><a href="/start/">Quick start</a></h3><p>Send a file from a page in twelve lines, and open it from a link. The access token, the key and the link, each in its place.</p></div>
<div class="card"><h3><a href="/docs/">The modules</a></h3><p>Ten modules, one import. What each does, what it returns, and the error codes a caller is expected to act on.</p></div>
<div class="card"><h3><a href="/docs/versioning/">Independent releases</a></h3><p>Every minor release is a complete copy of the code. No overlays, no shared files between versions, and a change is always the next directory.</p></div>
<div class="card"><h3><a href="/for-evaluators/">For evaluators</a></h3><p>What leaves the browser and what never does, the two secrets that must not be confused, the vendored code and its hashes, and how to check the live host yourself.</p></div>
</div>

## What it is, in one table

| | |
|---|---|
| **An API with no server** | "API" here means client-side: the modules, formats and contracts a browser runs. This host serves files over GitHub Pages and receives nothing. The server the modules talk to is the SG/Send API at `send.sgraph.ai`, or any host that serves the same routes, including [the one in memory](/docs/server/) that the tests use |
| **One release, one directory** | `/v0.1.1/` holds `send/` (the modules), `vendor/` (the vault library and the QR encoder, unchanged and hashed), `tests/` (co-located, runnable with Node and in a browser) and `manifest.json`. Nothing in it loads from another release or another host |
| **Pinned by address** | A consuming site names one release in a file, copies its manifest, and loads the code by its full address. Its own gate can then refuse a reference that is not pinned or not in the manifest |
| **Compatible with send.sgraph.ai** | The ciphertext layout, the SGMETA envelope, the friendly-token derivations and the link fragments are the ones send.sgraph.ai has shipped since its v0.2.x, so a transfer made here opens there and the other way round. Proved against the published contracts and the in-memory server; a round trip against the live host is still to run, and [the reality file](/about/reality/) says so |
| **Tests that run against real things** | 43 tests in Node against an in-memory implementation of the API, including real vaults made with the vendored library, two clients racing a publish, and the lazy-folder trap. No mocks |

## Where it sits in the estate

[send.sgit.ai](https://send.sgit.ai) is the product: the pages, the examples, the articles and the commercial model. This host is the code they run, kept apart so it has releases of its own, a review boundary, and a way for a second site (or an agent, or a workflow) to say exactly which version it means. The same shape as [api.newsroom.sgit.ai](https://api.newsroom.sgit.ai) for the newsroom, and the pattern is written up in [the first article](/articles/independent-releases.html). The brief it all started from is [published in full](/about/brief/), with [its corrections beside it](/about/corrections/).
