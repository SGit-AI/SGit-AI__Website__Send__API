# How to make a release

> The checklist, from copying the current release to checking the live host, with the commands.

*Source: <https://api.send.sgit.ai/how-to/make-a-release/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# How to make a release

```
cp -r releases/v0.1.0 releases/v0.1.1          # 1. a complete copy; change only v0.1.1
# 2. make the change, and a test under releases/v0.1.1/tests/ that fails without it
sed -i "s/VERSION = 'v0.1.0'/VERSION = 'v0.1.1'/" releases/v0.1.1/send/send-api.js
(cd releases/v0.1.1 && node --test 'tests/*.test.mjs')
python3 tools/release.py cut v0.1.1            # 3. the manifest
# 4. tools/version.json: version v0.1.1, release v0.1.1, today's date
# 5. website/data/versions.json: a new first entry, one sentence that says what changed and why
python3 tools/build.py && python3 tools/check.py
git add -A && git commit -m "api v0.1.1 : what changed" && git push
```

A change that touches only the website, the tests or the tooling bumps `version` and leaves `release` where it is. The deploy tags the version, publishes, and then runs `tools/live_check.py`; a clean push is not a release until that last job is green.

What the gate will refuse: a release directory whose files differ from its manifest, a vendored file that differs from its recorded hash, a page without a twin, a broken link, a script from another origin, an em-dash, a credential shape, a version that is not the newest in `versions.json`.
