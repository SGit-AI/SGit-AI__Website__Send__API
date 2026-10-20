# For evaluators

> The trust boundaries, what leaves the browser and what never does, the supply chain of this release and how to verify the live host yourself.

*Source: <https://api.send.sgit.ai/for-evaluators/> · api.send.sgit.ai v0.1.0 · this file is generated from the same content as the page, so the two cannot drift. Every page on this site has a `.md` twin; internal links below point at pages, swap `.html` for `.md` to read the twin.*

---

# For evaluators

## What leaves the browser, and what never does

| Leaves the browser | Never leaves |
|---|---|
| The ciphertext (IV, encrypted bytes, GCM tag) | The plaintext |
| The plaintext length, as display metadata | The file name: it is inside the ciphertext, in the SGMETA envelope |
| A `content_type_hint` the sender chooses; keep it generic | The decryption key: it is in the link's fragment, which browsers do not send |
| The access token, in a request header, to the API host only | The vault key, the read key, the keyring: this host receives nothing at all |
| For a vault: encrypted objects, refs and the write key's hex in a header, which the server stores only as a hash | The passphrase the vault key is made of |

The API host, `api.send.sgit.ai`, is GitHub Pages: it serves files and has no way to receive a request body. The server the modules talk to is `send.sgraph.ai` or whichever endpoint the page configures, and what that server can and cannot see is written up at [sgit.ai's security page](https://sgit.ai/security/).

## Two secrets that must not be confused

The **access token** says who may upload. The **decryption key** says who may read. They are unrelated values with unrelated jobs, and the failure that matters is silent: an access token in a URL lands in proxy logs and browser history; a key in a request reaches a server that should never have it. `send-transfers.js` puts the token in `x-sgraph-access-token` and nowhere else, and the tests assert that neither value appears in any logged request path.

## The supply chain of a release

- **Twelve vault library files** from SGraph-AI__App__Send at a named commit, copied unchanged, with a SHA-256 per file in `VENDOR.md`. The tests recompute every hash before loading a single one.
- **One QR encoder**, qrcode-generator 2.0.4, with its hash in its README.
- **Nothing else.** No framework, no bundler, no build step for the served code, nothing fetched at run time from any other origin. The gate fails a page that loads a script or a style from another host.
- **A manifest** of every file in the release with its size and SHA-256, recomputed by the gate on every commit and by the live check after every deploy.

## Verify the live host yourself

```
curl -s https://api.send.sgit.ai/releases.json | python3 -m json.tool
curl -s https://api.send.sgit.ai/v0.1.0/manifest.json > manifest.json
python3 - <<'PY'
import hashlib, json, urllib.request
m = json.load(open('manifest.json'))
for f, e in m['entries'].items():
    b = urllib.request.urlopen(f"https://api.send.sgit.ai/v0.1.0/{f}").read()
    print('ok ' if hashlib.sha256(b).hexdigest() == e['sha256'] else 'BAD', f)
PY
```

That is the same check `tools/live_check.py` runs at the end of every deploy. Until the DNS for this host is in place ([what needs a human](/about/needs/)), run it against the repository instead: `python3 tools/release.py check`.

## What this does not prove

- **Interoperability with the live send.sgraph.ai** is asserted from the published contracts and the in-memory server, not from a run against the production host. [The reality file](/about/reality/) marks it proposed until a round trip is recorded.
- **The keyring is plaintext at rest** in the browser's storage, and the page that uses it says so. The passkey-unlocked design at [secrets.sgit.ai](https://secrets.sgit.ai) is the stronger home.
- **A friendly token is guessable offline** by anyone holding the ciphertext: 1,024,000,000 possibilities and a 600,000-round derivation per guess. It is for links that expire.
