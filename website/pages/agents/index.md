---
title: For agents
description: The brief for an agent that is about to use or change this API, in the order to read things, with the rules that are not negotiable and the prompt to start from.
---

# For agents

You are reading the index for agents of api.send.sgit.ai. Every page here has a markdown twin at the same path with `.md` instead of `.html`, and [`/llms.txt`](/llms.txt) lists them all; [`/llms-full.txt`](/llms-full.txt) is every page in one request.

## Read in this order

1. [The reality file](/about/reality/): what exists. If it is not listed there, it does not exist, whatever a brief or this page implies.
2. [The release's README](/v0.1.0/README.md) and its [manifest](/v0.1.0/manifest.json): the files you may load, with their hashes.
3. [The contracts](/docs/contracts/): the byte layouts, the link grammar, the token derivations. These are the parts that must not drift from send.sgraph.ai.
4. [The server it speaks to](/docs/server/): the routes and the two secrets.
5. [Independent releases](/docs/versioning/): how a change is made.

## The rules

- **A release is never edited.** A change to anything under `releases/vX.Y.Z/` after it is on the default branch is a new release directory. The gate fails a hash that differs from the manifest.
- **A vendored file is never edited.** `vendor/sg-vault/v0.2.3/` and `vendor/qrcode-generator/2.0.4/` are copied upstream bytes with recorded hashes. A fix goes upstream; a refresh is a new release with the new hashes recorded.
- **The access token goes in a header; the key goes in the fragment; the file name goes in the envelope.** Never log the token or the key. Never put a vault key on a page, in a repository, in a commit message or in a transcript.
- **Publish a vault with compare-and-swap.** `vault.publish()` does; `push()` on the library overwrites what another client published and is not called anywhere in this release.
- **No mocks.** A test runs the real client against `tests/server.mjs`, a real implementation in memory. A credential test has a negative control.
- **No em-dashes, British spelling, status words on every claim.** The gate checks the first; the reviewer checks the rest.

## The prompt to start from

```
Read https://api.send.sgit.ai/agents/index.md, then /about/reality.md, then /v0.1.0/README.md.
The task: <what>. Work in releases/<next version>/, copied whole from the current release;
never edit a published release or a vendored file. Add a test under tests/ that fails without
the change and run `node --test 'tests/*.test.mjs'` there. Cut the manifest with
`python3 tools/release.py cut <version>`, bump tools/version.json and add the line to
website/data/versions.json, build with `python3 tools/build.py`, and run `python3 tools/check.py`.
Report what you changed, what the tests prove, and what the reality file now says.
```
