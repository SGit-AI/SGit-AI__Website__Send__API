# Version history

> One line per version, newest first, saying what changed and why. Every change that lands on dev is a version; the deploy tags it.

*Source: <https://api.send.sgit.ai/versions/> · api.send.sgit.ai v0.1.1 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Version history

Every change that lands on `dev` is a version, in `tools/version.json`, tagged by the deploy and shown in the header of every page. The `release` column is the cut of the code a site pins; it moves only when a served file changes.

| Version | Date | Kind | What changed, and why |
|---|---|---|---|
| **v0.1.1** | 2026-10-20 | fix | **the health check asks the route the hosted service serves.** Measured against send.sgraph.ai after the first deploy: /api/health is a 404 there and the health route is /api/info/health, so Settings on send.sgit.ai reported the hosted server as not answering. v0.1.1 is a whole copy of v0.1.0 with health() on /api/info/health, a new version() on /api/info/version, the in-memory server serving the same two routes and answering 404 on /api/health as production does, and a test that holds all of that. The CORS check the same run made is recorded on the server page: the hosted service allows any origin and every header this release sends. |
| **v0.1.0** | 2026-10-20 | release | **the first release: the modules send.sgit.ai runs, as one independent directory, with its tests and the server in memory.** From the four voice memos of 20 October 2026 (the brief, published in full). The modules: AES-256-GCM crypto with the SGMETA envelope, friendly tokens with the derivations send.sgraph.ai uses, the link grammar, the transfer client with send() and receive(), QR codes as SVG, the vault layer over the vendored library (publish with compare-and-swap, never push()), and the per-device keyring. 43 tests run in Node against the in-memory server; a browser smoke test runs the same modules in Chromium. The website, the gate and the release tooling come with it. |
