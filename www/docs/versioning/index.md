# Versioning, independent releases

> Every minor release is a complete copy of the code with no overlays and no shared files; majors are where the refactoring happens. The rules, the reasons, and how this differs from the IFD that came before it.

*Source: <https://api.send.sgit.ai/docs/versioning/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# Versioning: independent releases

## The rule

Every release under `releases/` is a complete, independent copy of the code. `v0.1.1` starts as a copy of `v0.1.0`, changed where the change is; nothing in it imports from `v0.1.0`, overrides a method of `v0.1.0`, or loads a stylesheet of `v0.1.0`. A page that pins `v0.1.0` keeps running `v0.1.0` whatever lands after it.

| Kind | Example | What happens |
|---|---|---|
| **Minor** | v0.1.1, v0.1.2 | Copy the current release whole, make the change, add the test that fails without it, cut the manifest. Quality control on each |
| **Major** | v0.2.0 | Consolidate: refactor what the minors proved into a clean copy, retire what did not survive, keep the contracts |
| **Release** | v1.0.0 | The previous major with no code change: version and documentation only |

## Why no overlays this time

The [IFD methodology](https://github.com/the-cyber-boardroom/SGraph-AI__App__Send/tree/dev/library/guides/development/ifd) that send.sgraph.ai is built with shares code between minor versions: a minor holds only its surgical overrides and links back to the base, so `v0.3.2` is `v0.3.0` plus two patch files loaded after it. That was the right trade when every line was written by hand and a full copy per version was a cost. Two things changed. The code here is small and its scope is deliberately narrow, so a copy is a few hundred kilobytes. And the agents that now write most of it work better with one tree they can read whole than with a base and three layers of overrides to compose in their heads; the override chains in send.sgraph.ai's `index.html` (load order comments eight items long) are the evidence. So the overlay goes, and what stays from IFD is everything else: minors for active development, majors for consolidation, tests co-located with what they test, real data from the first version, zero external dependencies.

## What it costs, and what it buys

- **Costs:** disk, trivially; and a fix that applies to several live releases has to be made in each, as a new minor of each, which is the point: a reader pinned to an old release gets nothing they did not ask for.
- **Buys:** a release that can be read, reviewed, hashed and reasoned about on its own; a manifest that is the whole truth; a consuming site that cannot be changed under its readers; and a fractal shape, where each component is independent by itself and can be lifted out, which is where this is going.

## The mechanics

1. `cp -r releases/v0.1.0 releases/v0.1.1`, then make the change in `v0.1.1` only.
2. `VERSION = 'v0.1.1'` in `send/send-api.js`; the gate checks it matches the directory.
3. A test in `tests/` that fails without the change; `node --test 'tests/*.test.mjs'` green.
4. `python3 tools/release.py cut v0.1.1` writes the manifest; `tools/version.json` says `release: v0.1.1`.
5. A line in `website/data/versions.json` that says what changed and why, in words a reader can act on.
6. `python3 tools/build.py && python3 tools/check.py`, commit, push. `main` deploys, tags, and checks the live host.

[How to make a release](/how-to/make-a-release/) is the same list as a checklist. The article that argues this out is [Independent releases](/articles/independent-releases.html).
