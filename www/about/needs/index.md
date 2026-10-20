# What needs a human

> The steps only the project lead can take for this host to be live, in order, with what each unblocks.

*Source: <https://api.send.sgit.ai/about/needs/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# What needs a human

Everything an agent could do is done; these steps need the lead's accounts.

1. **Merge the branch to `dev`.** The deploy workflow runs on `dev`; the branch `claude/wonderful-ride-c8qicn` carries v0.1.0.
2. **Enable GitHub Pages for the repository** with the source set to GitHub Actions (the workflow's `configure-pages` step does this when the repository allows it).
3. **DNS:** a `CNAME` record for `api.send.sgit.ai` pointing at `sgit-ai.github.io`. The `CNAME` file in the repository names the host; Pages will issue the certificate once the record resolves.
4. **Let the first deploy finish.** Its last job polls the live host for up to ten minutes and compares every file of v0.1.0 with the manifest; until the DNS resolves it fails, by design.
5. **An access token for the live round trip.** `releases/v0.1.0/tests/transfers.test.mjs` runs against the in-memory server; run the same calls against `https://dev.send.sgraph.ai` with a token to move interoperability from proposed to shipped in the reality file.
6. **Decide where the articles live.** [Independent releases](/articles/independent-releases.html) is here; the guidance on every site's own articles is on send.sgit.ai; both are in the newsroom's format so they can be imported unchanged.
