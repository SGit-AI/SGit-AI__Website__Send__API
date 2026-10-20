---
title: How to run the tests
description: The Node tests against the in-memory server, the browser smoke test in Chromium, and the gate; what each proves.
---

# How to run the tests

## In Node, against the server in memory

```
cd releases/v0.1.0
node --test 'tests/*.test.mjs'
```

43 tests in about four seconds. `tests/server.mjs` starts on a random port; every test runs the real client against it. `tests/vault.test.mjs` first checks the hash of each of the twelve vendored files against `VENDOR.md`, then loads them into the realm the way a page does, then makes real vaults: create, nested writes after a fresh open, two clients racing a publish, history, a wrong write key refused.

## In a browser

```
node tests/test_browser.mjs
```

Starts the in-memory server and a static server for the release, opens `tests/browser.html` in Chromium with Playwright, and checks that the same modules load as ES modules on a page, encrypt and decrypt, draw a QR code, send and receive a transfer, and create and read back a vault. The pre-installed Chromium is used when Playwright has none of its own.

## The gate

```
python3 tools/check.py
```

What CI runs on every commit. [The modules](/docs/) lists the error codes the tests exercise; [for evaluators](/for-evaluators/) says what the tests do not prove.
