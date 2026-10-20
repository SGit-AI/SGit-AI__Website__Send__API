# SGit-AI__Website__Send__API

The client-side API behind [send.sgit.ai](https://send.sgit.ai): the modules a browser runs to encrypt a file with its
name inside the ciphertext, upload it as a transfer or commit it into a vault, draw the link as a QR code, and keep the
keys on the device. Published at **api.send.sgit.ai** (this repository's GitHub Pages site) as versioned releases,
`https://api.send.sgit.ai/<release>/<path>`, that send.sgit.ai and anyone else pin by address. No server, nothing to
deploy but files. Current version v0.1.0.

- **The release:** [`releases/v0.1.0/`](releases/v0.1.0/README.md), a complete, independent copy of the code: `send/`
  (ten ES modules), `vendor/` (the vault library v0.2.3 and qrcode-generator 2.0.4, unchanged and hashed), `tests/`
  (43 tests and the SG/Send API in memory) and `manifest.json`. Never edited after it is on `dev`; a change is the
  next directory.
- **The website:** `website/` is the source (markdown pages with front matter, `site.json`, the assets); `www/` is what
  `python3 tools/build.py` writes and is committed; the deploy serves it at the root beside the releases.
- **What is real:** [`website/data/features.json`](website/data/features.json), rendered at `/about/reality/`. If it is
  not listed there, it does not exist.
- **The brief, in full:** [`briefs/`](briefs/), the four voice memos of 20 October 2026 as transcribed, with
  [`BRIEF-CORRECTIONS.md`](BRIEF-CORRECTIONS.md) beside them.
- **For agents:** `/llms.txt` and `/llms-full.txt` on the site; every page has a markdown twin at the same path.

## Working on it

```
python3 tools/build.py                      # write www/ from website/
python3 tools/check.py                      # the gate: what CI runs
(cd releases/v0.1.0 && node --test 'tests/*.test.mjs')   # the release's tests, ~4 s, no network
node tests/test_browser.mjs                 # the same modules on a page, in Chromium (Playwright)
node releases/v0.1.0/tests/server.mjs 8787 local-dev-token   # the API in memory, for a page on a laptop
python3 tools/release.py cut v0.1.1         # the manifest of a new release
```

Every change that lands on `dev` is a version (`tools/version.json`); the deploy tags it, publishes, and then asks the
live host for the hash of every file of the current release. The rules a contributor or an agent follows are on the
site at `/agents/`; the release discipline at `/docs/versioning/`.

Code Apache-2.0 (see [LICENSE](LICENSE)); content CC BY 4.0; vendored files keep their own licences in their folders.
