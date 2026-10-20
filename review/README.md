# review/

The project as layered graphs, per sgit.ai's review brief (https://sgit.ai/docs/briefs/code-review-graphs-in-the-repository.html).
Started with the repository on 20 October 2026, delta first:

- `intent/brief.json`: the brief as sections, top down, each carrying the memo it came from and the files that answer it.
- `self/`: reserved for the review of the review tooling; empty until a derived graph exists.

The derived layer (the code read bottom up from the syntax tree by a parser, the join with the intent, the per-commit
reading, the navigator) is **proposed** and listed as such in `website/data/features.json`. Until it exists this
folder is the intent alone, and the reality file says so.
