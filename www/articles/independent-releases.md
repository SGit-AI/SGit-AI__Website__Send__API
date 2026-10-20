# Independent releases: an API for a site is a directory you never edit, and every minor is a whole copy

> A pattern is starting to repeat across the sgit.ai sites. A site gets a domain, storyboards.sgit.ai say, and beside it an api.storyboards.sgit.ai that holds the code the site runs, released and versioned on its own, the way api.newsroom.sgit.ai already does for the newsroom and api.send.sgit.ai now does for send.sgit.ai. The versioning comes from Iterative Flow Development, which I have written about for years, with one change that the last twelve months of working with agents made possible. In IFD a minor version holds only its surgical overrides and links back to the base; here every minor release is a complete, independent copy of all the code. No overlay, no shared file between versions, nothing in v0.1.1 that loads from v0.1.0. The quality control happens on each minor, the refactoring happens at the major, and because the scope of each of these APIs is deliberately small the copy costs nothing a reader would notice. What it buys is a release that can be read whole, hashed whole and reasoned about whole, by a person or by an agent, and a consuming site that cannot be changed under its readers. The shape is fractal on purpose, each component independent by itself, and I would like it to be the default for every api.<site>.sgit.ai that follows.

*Source: <https://api.send.sgit.ai/articles/independent-releases.html> · api.send.sgit.ai v0.1.1 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

By Dinis Cruz · 2026-10-20 · published

**Summary:** A pattern is starting to repeat across the sgit.ai sites. A site gets a domain, storyboards.sgit.ai say, and beside it an api.storyboards.sgit.ai that holds the code the site runs, released and versioned on its own, the way api.newsroom.sgit.ai already does for the newsroom and api.send.sgit.ai now does for send.sgit.ai. The versioning comes from Iterative Flow Development, which I have written about for years, with one change that the last twelve months of working with agents made possible. In IFD a minor version holds only its surgical overrides and links back to the base; here every minor release is a complete, independent copy of all the code. No overlay, no shared file between versions, nothing in v0.1.1 that loads from v0.1.0. The quality control happens on each minor, the refactoring happens at the major, and because the scope of each of these APIs is deliberately small the copy costs nothing a reader would notice. What it buys is a release that can be read whole, hashed whole and reasoned about whole, by a person or by an agent, and a consuming site that cannot be changed under its readers. The shape is fractal on purpose, each component independent by itself, and I would like it to be the default for every api.<site>.sgit.ai that follows.

![Two ways to lay out versions. On the left, IFD as send.sgraph.ai runs it, a base v0.3.0 with v0.3.1 and v0.3.2 as thin overlays loaded after it, each holding only the methods it overrides. On the right, the pattern here, v0.1.0 and v0.1.1 as two complete directories, each with its own modules, vendored libraries, tests and manifest, and nothing between them.](/articles/images/independent-releases.svg)

*Two ways to lay out versions. On the left, IFD as send.sgraph.ai runs it, a base v0.3.0 with v0.3.1 and v0.3.2 as thin overlays loaded after it, each holding only the methods it overrides. On the right, the pattern here, v0.1.0 and v0.1.1 as two complete directories, each with its own modules, vendored libraries, tests and manifest, and nothing between them.*
## In short {#in-short}

- **A site and its API are two repositories.** The site holds the pages, the examples, the articles and the commercial model; the API holds the code the pages run, released on its own at `api.<site>.sgit.ai`. Two sites do this today, the newsroom and Send, and storyboards is announced.
- **An API release is a directory that is never edited.** `/v0.1.0/` on api.send.sgit.ai is 34 files with a manifest of every SHA-256, served as it is in the repository, pinned by address by the site that uses it.
- **Every minor release is a complete copy.** That is the change from IFD: no surgical overrides, no link back to a base, no shared file between versions. v0.1.1 starts as a copy of v0.1.0 and changes where the change is.
- **The quality control is per minor, the refactoring is per major.** Each minor is tested on its own, with its tests inside it; the major consolidates what the minors proved into a clean copy.
- **The scope is what makes the copy cheap.** api.send.sgit.ai's first release is 270 kilobytes including its tests and the server it tests against; the newsroom's is 1.15 megabytes. A copy per release is not a cost at that size.
- **The shape is fractal.** Each component should be independent by itself, so that it can be lifted out, pinned, or replaced without the rest knowing.
- **What was built:** api.send.sgit.ai v0.1.0, with the release discipline, the gate and the pipeline, and send.sgit.ai pinning it.

## The pattern that is emerging {#pattern}

For a while each of the `*.sgit.ai` sites was one repository: the content, the pages and whatever code the pages ran, all in one tree, changed in the same commit as an article. That is the right way to write the first version of anything. It stops being right when something depends on the code: a second site, an agent, a workflow somebody built on it. A change to the reading meter was a change to the newsroom with no version of its own, and when sgit.ai wanted the same meter there was no way to say which meter it meant. [Go slow to go fast](https://newsroom.sgit.ai/articles/explorer-to-villager-newsroom.html) is where I worked that out, and [the reader as an API](https://api.newsroom.sgit.ai/articles/the-reader-as-an-api.html) is the agent's account of doing it: seventy-four files moved to a host of their own, proved byte for byte, pinned by the site.

So the pattern, as it now stands, is this. A site gets a domain: storyboards.sgit.ai, coming soon. Beside it comes api.storyboards.sgit.ai, the same way there is api.newsroom.sgit.ai and now api.send.sgit.ai. The API is the code the site runs, and the site is the usage of it: the examples, the explanation, the commercial angle. "API" is the honest word even though there is no server, because what the host owns is the contracts other pages and agents program against: the formats, the link grammar, the byte layouts, the components. The host serves files and receives nothing.

## What IFD said, and what changes {#ifd}

The versioning comes from [Iterative Flow Development](https://github.com/the-cyber-boardroom/SGraph-AI__App__Send/tree/dev/library/guides/development/ifd), which I have been writing about and building with for years, and which send.sgraph.ai is built on. IFD has three kinds of version. Minors, v0.1.1 and v0.1.2, are where active development happens. Majors, v0.2.0, consolidate what the minors proved. Releases, v1.0.0, are a major with no code change. The rule for minors was that they share as much code as possible: a minor holds only its surgical overrides, a method here, a CSS rule there, and links back to the base version that loads before it. The unit of change was the change itself, not the file.

That was the right trade when every line was written by hand and a full copy per version meant a lot of duplicated effort to keep in sync. Two things are different now. The models are better, and the work goes a lot more smoothly: the agents writing most of this code do their best work with one tree they can read whole, and the override chains in send.sgraph.ai's pages, where the load order comment runs to eight numbered items and a later file patches a prototype a previous one patched, are exactly the kind of thing that trips them. And the scope of these APIs is kept deliberately small, so a complete copy is a few hundred kilobytes.

So the one change: **every minor release is 100% independent.** It is a full copy of all the code. Nothing in v0.1.1 loads from v0.1.0; nothing overrides anything. Unless there is a particular reason to use the previous one, and for these APIs I do not expect one, the overlay is gone. Everything else in IFD stays: minors for active work, majors for consolidation, tests next to the code they test, real data from the first version, no framework, no build step.

## What a release is, in practice {#release}

On api.send.sgit.ai a release is a directory, `releases/v0.1.0/`, that holds four things: `send/`, the ten modules a page imports; `vendor/`, the vault library and the QR encoder copied unchanged from upstream with a recorded hash for each file; `tests/`, forty-three tests and the API they run against, implemented in memory in one Node file; and `manifest.json`, every file with its size and SHA-256. The gate recomputes every hash on every commit and fails when the tree is not the release it names. After a deploy, a last job fetches every file from the live host and compares again, because green does not mean live.

A site pins it in one line, `{ "release": "v0.1.0" }`, copies the manifest, loads the code by its full address, and lets its own gate refuse any reference that is not pinned or not in the manifest. A page on send.sgit.ai imports `https://api.send.sgit.ai/v0.1.0/send/send-api.js` and will keep importing that, whatever lands after it, until somebody changes the one line.

## Why the whole copy is worth it {#why}

- **It can be read whole.** A reviewer, or an agent asked to review, opens one directory and sees everything that runs. There is no base to hold in one hand and three overlays in the other.
- **It can be hashed whole.** The manifest is the whole truth about a release. With overlays the truth is the base's manifest plus each overlay's plus the load order, and the load order lived in an HTML comment.
- **It can be tested whole.** The tests and the server they run against are inside the release. `cd releases/v0.1.0 && node --test` is the whole story.
- **It cannot change under a reader.** A fix is the next directory. A page that pinned the old one gets nothing it did not ask for, which is the only honest way to serve a page that holds keys.
- **It is fractal.** Each component is independent by itself. Each release is independent of every other. The API is independent of the site. The thing composes the same way at every scale, which is what lets a piece be lifted out and used somewhere else, and that was the point of making it an API at all.

What it costs is a fix that applies to several live releases having to be made in each, as a new minor of each. That is work, and it is the right work: it makes the person doing it decide, per release, whether the readers pinned to it want the change.

## Where this goes {#next}

I would like this to be the default for every `api.<site>.sgit.ai` that follows: storyboards next, and whichever site after that grows code somebody else depends on. The mechanics are short enough to fit on [one page](https://api.send.sgit.ai/how-to/make-a-release/): copy the release, change it, test it, cut the manifest, bump the version, write the line that says what changed and why. The gate and the pipeline do the rest, and they are the same files in both repositories so far, which is its own small test of the fractal claim.

## What this does not claim {#limits}

- **It is not a verdict on IFD's overlays.** They are still how send.sgraph.ai is built and they were right for it. This is a change in the trade, made possible by better agents and a smaller scope.
- **Two sites is a pattern starting, not a pattern established.** The newsroom and Send do this today; storyboards has a name and an empty repository. The counts are in [the corrections file](https://api.send.sgit.ai/about/corrections/).
- **A whole copy does not make a release correct.** It makes it readable, hashable and pinnable. The tests make it correct, and the reality file says what they prove and what they do not.
- **"API with no server" means the host receives nothing.** The modules still talk to an SG/Send server, and what that server sees is on its own security page.

If you run a site with code somebody else depends on, write to [agent@riskmandate.ai](mailto:agent@riskmandate.ai).

## Where this comes from {#sources}

A voice memo of mine on 20 October 2026, written up by the agent that built api.send.sgit.ai in the same session; the editorial responsibility is mine. Sources: [the IFD guides](https://github.com/the-cyber-boardroom/SGraph-AI__App__Send/tree/dev/library/guides/development/ifd) in the SG/Send repository (v1.1.0 and the versioning guide v1.2.0), read in full; [Go slow to go fast](https://newsroom.sgit.ai/articles/explorer-to-villager-newsroom.html) and [the reader as an API](https://api.newsroom.sgit.ai/articles/the-reader-as-an-api.html) on the newsroom's move; [every sgit repository](https://sgit.ai/docs/guidance/repositories.html) on sgit.ai for the release discipline. Counts: 34 files and 270,337 bytes from `releases/v0.1.0/manifest.json`; 43 tests from `node --test`; 74 files and 1.15 MB from the newsroom API's own article; the eight-item load order from `sgraph_ai_app_send__ui__user/v0/v0.3/v0.3.2/en-gb/index.html`, all read on 20 October 2026.
