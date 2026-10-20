---
title: For developers
description: How to take a release into a site, what to pin, what the gate should check, what runs where, and how to run the tests and the server in memory.
---

# For developers

## Take a release

1. Name the release in one file of your site, for example `build/api.json`: `{ "host": "https://api.send.sgit.ai", "release": "v0.1.0" }`.
2. Copy `https://api.send.sgit.ai/v0.1.0/manifest.json` next to it, so your build knows the hash of every file it may load.
3. Load the code by its full address, `https://api.send.sgit.ai/v0.1.0/send/send-api.js`, in a `<script type="module">` or an import map.
4. Add a check to your gate: every reference to this host is pinned to the release you named and is a path in the manifest. send.sgit.ai's gate does exactly this.

A script loaded from another host still runs on your page's origin, so the keyring, the clone branch and everything the modules store stay in your site's storage. This host has no way to receive anything.

## What runs where

| Module | Browser | Node 20+ | Needs |
|---|---|---|---|
| crypto, envelope, friendly, words, link, keyring | yes | yes | `globalThis.crypto` (a secure context in a browser) |
| transfers | yes | yes | `fetch`; an access token for writes |
| qr | yes | yes | nothing |
| vault | yes | yes, after loading the twelve library files into the realm (`tests/_lib.mjs` shows how) | an access token for creating and writing |

## Run the tests

```
cd releases/v0.1.0
node --test 'tests/*.test.mjs'
```

43 tests, about four seconds, no network: `tests/server.mjs` starts the API in memory on a random port and the client code runs unchanged against it. [How to run the tests](/how-to/run-the-tests/) has the rest, including the browser run.

## Run the server for local development

```
node releases/v0.1.0/tests/server.mjs 8787 local-dev-token
```

Point a page at `http://localhost:8787` with the access token `local-dev-token` and everything works without an account: transfers, vaults, download caps, expiry, revocation. It forgets everything when it stops. [The server it speaks to](/docs/server/) lists the routes.

## Make a change

A change to a served file is a new release: copy `releases/v0.1.0/` to `releases/v0.1.1/`, make the change there with a test that fails without it, cut the manifest, bump `tools/version.json`, and let the gate and the pipeline do the rest. [How to make a release](/how-to/make-a-release/) is the checklist; [independent releases](/docs/versioning/) is why it works this way.
