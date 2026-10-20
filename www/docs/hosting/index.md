# Hosting and pinning

> How a release is served, what a consuming site pins and checks, the CORS the host sends, and the subresource integrity question.

*Source: <https://api.send.sgit.ai/docs/hosting/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Hosting and pinning

## How a release is served

`main` is the release branch. A push runs the gate, tags the version, assembles the Pages tree (`www/` at the root and every `releases/vX.Y.Z/` directory beside it as `/vX.Y.Z/`) and deploys it; a last job then fetches every file of the current release from the live host and compares its hash with the manifest. `/releases.json` lists every release with its date, file count and size.

GitHub Pages sends `access-control-allow-origin: *`, which is what lets a module on this host be imported by a page on another, and it has no way to receive a request.

## What a site pins

```json
{ "host": "https://api.send.sgit.ai", "release": "v0.1.0" }
```

One file, one line. The site copies the release's `manifest.json` beside it, and its gate fails the build on a reference to this host that is not pinned to that release or not a path in the manifest. send.sgit.ai does this in `admin/build/api.json` and its `tools/check.py`.

## Subresource integrity

A `<script type="module">` with an `integrity` attribute works for the entry module but not for the modules it imports, so this host does not promise SRI for the whole graph. What it promises instead: a release directory is never edited, the manifest carries every hash, and the live check runs after every deploy. A site that must not change under its readers (one holding keys) copies the release into its own origin at a known commit, as [the vault-from-JavaScript page](https://sgit.ai/docs/vault/vault-from-javascript.html) asks, and the gate's origin check lets that through because the files are then its own.

## Caching

Release files are immutable by construction, so a CDN may cache them for as long as it likes. `releases.json` and the website's pages change on every version; keep a short freshness window on those.
