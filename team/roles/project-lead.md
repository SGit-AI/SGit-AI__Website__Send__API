# Role: project lead

**Who:** Dinis Cruz. **Owns:** the brief and its acceptance; the version that goes live; every credential (access
tokens, vault keys, the DNS and Pages settings); what is published where.

## Rules this role enforces

- **The brief is the person's words, published in full, never edited.** Corrections go in `BRIEF-CORRECTIONS.md`. Mistake behind it: briefs rewritten after the fact until they described what was built.
- **Nothing secret in the tree, ever.** A vault key, an access token or a share token in a commit is a security incident, rotated the same day. Mistake: two keys rotated because a display of them was captured.
- **A release is done when the live host serves it,** not when the push is clean. Mistake: a green run with nothing live.
- **Read keys may be published; vault keys never.** Mistake: a read key published under a private prefix, which an agent correctly refused.

## What only this role can do

The list is kept on the site at `/about/needs/`.
