# Brief corrections

Where the brief was wrong, where the agent's reading of it was wrong, and what was done instead. The brief itself
(`briefs/`, and `/about/brief/` on the site) is never edited; this file is corrected from.

| Date | Where | What was found | What was done |
|---|---|---|---|
| 2026-10-20 | Memo 1, "replicates the functionality that we had on send.sgraph.ai" | send.sgraph.ai at v0.34 has far more than a first release can carry: folders, text and secret transfers, presigned multipart uploads for large files, seventeen locales, a share zip of a vault, a gallery, an admin console. | v0.1.0 carries the core: file transfers under 4 MB, friendly tokens, QR codes, vaults with the keyring. The rest is listed as proposed in the reality file rather than described as present. |
| 2026-10-20 | Memo 3, "every minor release is 100% independent" | Taken literally, this includes the tests and the in-memory server, which doubles every release's size with code a page never loads. | They are included anyway: a release that can be tested on its own is the point, and 270 KB is not a cost. The manifest lists them; a consuming site loads only `send/`. |
| 2026-10-20 | Memo 3, "the pattern of creating APIs for some of these websites" | Only one such API existed before this one (api.newsroom.sgit.ai); storyboards is a name with an empty repository. | The article says "two sites and a third announced", counted, not "a pattern across the estate". |
| 2026-10-20 | Memo 4 | The memo asks for the centralised page to be published in the newsroom and imported from there. This session has write access to the two Send repositories only. | The page is published on send.sgit.ai in the newsroom's article format so it can be imported unchanged, and the ask to move it is recorded under what needs a human. |
| 2026-10-20 | The reading, "QR codes instead of pass keys" | The memo's "pass keys" most likely means the friendly tokens and the beta access gate, not WebAuthn passkeys; the transcription does not settle it. | QR codes carry the link (with the key, or the friendly token); friendly tokens stay as the spoken-aloud form and are not removed. Passkeys in the WebAuthn sense are untouched and belong to secrets.sgit.ai. |
| 2026-10-20 | Interoperability with send.sgraph.ai | Asserted from the published contracts and the code, not proved against the live host; a round trip needs an access token this session did not have. | Marked proposed in the reality file; the test to run is written in `tests/transfers.test.mjs` and needs only an endpoint and a token. |
