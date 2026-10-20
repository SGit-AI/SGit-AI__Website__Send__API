# About this repository

> What api.send.sgit.ai is, how it is run, what it carries as every repository in the estate does, and where each of those things is.

*Source: <https://api.send.sgit.ai/about/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# About this repository

api.send.sgit.ai is the client-side API behind [send.sgit.ai](https://send.sgit.ai): the code a browser runs to encrypt a file, keep its name inside the ciphertext, upload it as a transfer or commit it into a vault, draw the link as a QR code, and keep the keys on the device. It is published as releases a page pins by address. The repository is [SGit-AI__Website__Send__API](https://github.com/SGit-AI/SGit-AI__Website__Send__API).

It follows [what every sgit repository carries](https://sgit.ai/docs/guidance/repositories.html):

| Thing | Where |
|---|---|
| The brief, in full | [/about/brief/](/about/brief/), from `briefs/` |
| The reality file | [/about/reality/](/about/reality/), from `website/data/features.json` |
| The corrections file | [/about/corrections/](/about/corrections/), `BRIEF-CORRECTIONS.md` |
| One version, going up on every push | `tools/version.json`, shown in every header, [the history](/versions/) |
| The gate | `tools/check.py`, [what it checks](/how-to/make-a-release/) |
| Tests against real things | `releases/v0.1.0/tests/`, [how to run them](/how-to/run-the-tests/) |
| The review folder | `review/intent/`: the brief as sections; the derived graph is proposed |
| Roles and a board, as files | [/about/team/](/about/team/), `team/` |
| A credentials tier that is never committed | nothing in this repository needs a credential; the tripwire scans every tracked file anyway |
| Machine-readable twins | a `.md` beside every page, [/llms.txt](/llms.txt), [/llms-full.txt](/llms-full.txt) |
| Licences and the disclosure | code Apache-2.0, content CC BY 4.0, [the participant disclosure](/about/participant/) |

What only a person can do next is on [/about/needs/](/about/needs/).
