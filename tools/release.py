#!/usr/bin/env python3
"""release.py: the releases of api.send.sgit.ai, as directories that are never edited after they are published.

    python3 tools/release.py cut [release]      write releases/<release>/manifest.json from the tree (SHA-256 of every file)
    python3 tools/release.py check              every release's manifest matches its files, nothing is missing or extra,
                                                the vendored hashes match VENDOR.md, and tools/version.json names a release that exists
    python3 tools/release.py site --out DIR     assemble the GitHub Pages tree: www/ at the root, releases/ beside it, CNAME, .nojekyll
    python3 tools/release.py list               the releases, newest first, as JSON

Every minor release is a complete, independent copy of the code: no file in one release loads from another, and a
change to a served file is a new release directory (the next version), never an edit of an old one.
"""
import hashlib
import json
import re
import shutil
import sys

from pathlib import Path


ROOT     = Path(__file__).resolve().parents[1]
RELEASES = ROOT / 'releases'
SKIP     = {'manifest.json'}
RE_VER   = re.compile(r'^v\d+\.\d+\.\d+$')


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def files_of(release_dir):
    out = []
    for p in sorted(release_dir.rglob('*')):
        if p.is_file() and p.name not in SKIP and '__pycache__' not in p.parts and not p.name.startswith('.'):
            out.append(p.relative_to(release_dir).as_posix())
    return out


def version():
    return json.loads((ROOT / 'tools' / 'version.json').read_text(encoding='utf-8'))


def releases():
    return sorted((d.name for d in RELEASES.iterdir() if d.is_dir() and RE_VER.match(d.name)), key=lambda v: tuple(int(x) for x in v[1:].split('.')), reverse=True)


def cut(release):
    d = RELEASES / release
    if not d.is_dir():
        sys.exit(f'release.py cut: no directory {d}')
    entries = {f: {'bytes': (d / f).stat().st_size, 'sha256': sha256(d / f)} for f in files_of(d)}
    manifest = {'release': release, 'date': version()['date'], 'files': len(entries), 'bytes': sum(e['bytes'] for e in entries.values()),
                'note': 'A complete, independent copy of the code. Never edited after publishing: a change is the next release.',
                'entries': entries}
    (d / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'cut {release}: {len(entries)} files, {manifest["bytes"]} bytes')


def vendor_hashes_ok(d):
    ok = True
    vendor_md = d / 'vendor' / 'sg-vault' / 'v0.2.3' / 'VENDOR.md'
    if vendor_md.exists():
        recorded = dict(re.findall(r'\| `([^`]+)` \| `([0-9a-f]{64})` \|', vendor_md.read_text(encoding='utf-8')))
        for f, h in recorded.items():
            if sha256(vendor_md.parent / f) != h:
                print(f'  vendored file differs from VENDOR.md: {f}'); ok = False
    qr_md = d / 'vendor' / 'qrcode-generator' / '2.0.4' / 'README.md'
    if qr_md.exists():
        m = re.search(r'SHA-256 `([0-9a-f]{64})`', qr_md.read_text(encoding='utf-8'))
        if m and sha256(qr_md.parent / 'qrcode.mjs') != m.group(1):
            print('  vendored qrcode.mjs differs from its README'); ok = False
    return ok


def check():
    ok = True
    names = releases()
    if not names:
        print('no releases'); return 1
    for name in names:
        d = RELEASES / name
        mf = d / 'manifest.json'
        if not mf.exists():
            print(f'{name}: no manifest.json (run: release.py cut {name})'); ok = False; continue
        manifest = json.loads(mf.read_text(encoding='utf-8'))
        actual = files_of(d)
        listed = sorted(manifest.get('entries', {}))
        missing = sorted(set(listed) - set(actual)); extra = sorted(set(actual) - set(listed))
        for f in missing: print(f'{name}: listed but missing: {f}'); ok = False
        for f in extra:   print(f'{name}: in the tree but not in the manifest: {f}'); ok = False
        for f in listed:
            if f in actual and sha256(d / f) != manifest['entries'][f]['sha256']:
                print(f'{name}: hash differs: {f}'); ok = False
        if manifest.get('release') != name:
            print(f'{name}: manifest names {manifest.get("release")}'); ok = False
        if not vendor_hashes_ok(d): ok = False
        api = d / 'send' / 'send-api.js'
        if api.exists() and f"VERSION = '{name}'" not in api.read_text(encoding='utf-8'):
            print(f'{name}: send/send-api.js does not export VERSION = {name!r}'); ok = False
        print(f'{name}: {len(actual)} files {"ok" if not (missing or extra) else "DIFFER"}')
    v = version()
    if v['release'] not in names:
        print(f'tools/version.json names release {v["release"]}, which does not exist'); ok = False
    if not RE_VER.match(v['version']):
        print(f'tools/version.json version {v["version"]} is not vX.Y.Z'); ok = False
    print('release: PASSED' if ok else 'release: FAILED')
    return 0 if ok else 1


def site(out):
    out = Path(out)
    if out.exists(): shutil.rmtree(out)
    shutil.copytree(ROOT / 'www', out)
    for name in releases():
        shutil.copytree(RELEASES / name, out / name, ignore=shutil.ignore_patterns('__pycache__', '.*'))
    (out / 'releases.json').write_text(json.dumps({'current': version()['release'], 'releases': [json.loads((RELEASES / n / 'manifest.json').read_text(encoding='utf-8')) | {'entries': None} for n in releases()]}, indent=2) + '\n', encoding='utf-8')
    for f in ('CNAME', '.nojekyll'):
        if (ROOT / f).exists(): shutil.copy(ROOT / f, out / f)
    print(f'site assembled at {out}: {sum(1 for p in out.rglob("*") if p.is_file())} files')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] not in ('cut', 'check', 'site', 'list'):
        sys.exit(__doc__)
    if args[0] == 'cut':
        cut(args[1] if len(args) > 1 else version()['release'])
    elif args[0] == 'check':
        sys.exit(check())
    elif args[0] == 'site':
        site(args[args.index('--out') + 1] if '--out' in args else '_site')
    else:
        print(json.dumps(releases()))
