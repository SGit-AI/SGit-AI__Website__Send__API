# Role: build agent

**Who:** a Claude session, one per task, under the lead's behaviour policy. **Owns:** the code, the tests, the site,
the gate and the release, from a brief; writes next to the brief, never into it.

## Rules this role enforces

- **A release is never edited after it is on `dev`.** A change is the next directory, copied whole. Mistake: a reader pinned to a release that changed under them.
- **A vendored file is never edited.** A fix goes upstream; a refresh is a new release with new hashes recorded. Mistake: two ports of the vault writer that drifted.
- **No mocks.** A test runs the real client against `tests/server.mjs`; a credential test has a negative control. Mistake: a test that passed with a wrong input.
- **Every claim carries a status,** shipped, proposed or absent, from `features.json`. Mistake: a feature described in the present tense that a brief had only proposed.
- **Every number is counted** by a script the page can name. Mistake: a count that was remembered.
- **The access token in a header, the key in the fragment, the name in the envelope; none of them in a log, a URL or a transcript.** Mistake: an access token in a query string, found in a proxy log.
- **No em-dashes, British spelling, they/them when pronouns are unknown.** The gate fails the first.
- **Publish a vault with compare-and-swap.** `push()` is never called. Mistake: a commit silently dropped by an unconditional push.

## Starting prompt

On the site at `/agents/`.
