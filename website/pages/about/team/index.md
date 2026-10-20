---
title: The team
description: Who does what on this repository, as files: one person, one build agent, and the roles borrowed from the SG/Send team when their expertise is needed.
---

# The team

Two roles fill every seat today, and each is a file in `team/roles/` with the rules it enforces and the mistake behind each.

| Role | Who | Owns |
|---|---|---|
| **Project lead** | Dinis Cruz | The brief, acceptance, the version that goes live, every credential, DNS and Pages |
| **Build agent** | a Claude session, one per task, under the lead's behaviour policy | The code, the tests, the site, the gate, the release; writes next to the brief, never into it |

When a question needs an expert's view the agent reads the role file of the SG/Send team that owns it and answers in that role: the Architect for a boundary or a contract, AppSec for a key or a claim, the Librarian for what is real, the Ambassador for how a thing is described to the people it is for. Those roles live in [SGraph-AI__App__Send/team/roles](https://github.com/the-cyber-boardroom/SGraph-AI__App__Send/tree/dev/team/roles) and are not copied here.

## The board

Work is files with a status line: the reality file's proposed rows are the backlog, [the corrections](/about/corrections/) are the findings, and [what needs a human](/about/needs/) is the lead's queue. An issues vault is proposed and not yet made.

## The rules the roles enforce

- **A release is never edited after it is on `dev`.** Mistake behind it: a reader pinned to a release that changed under them.
- **A vendored file is never edited.** Mistake: two drifting ports of the vault writer, each needing its own fix.
- **A number on a page is counted.** Mistake: a word count that was remembered, and wrong.
- **A claim carries a status.** Mistake: a feature described in the present tense that a brief had only proposed.
- **Nothing secret in the tree.** Mistake: a live key published in a field no sgit pattern matched.
