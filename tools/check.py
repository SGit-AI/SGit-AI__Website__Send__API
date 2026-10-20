#!/usr/bin/env python3
"""check.py: the gate. One command, identical locally and in CI; a release that fails here fails the same way there.

    python3 tools/check.py

What it checks, each of which has caught a real defect somewhere in the estate (sgit.ai/docs/guidance/repositories.html, section 4):
  1. www/ is what tools/build.py writes, and every release matches its manifest (tools/release.py check)
  2. every script parse-checks (node --check), every Python file compiles
  3. every internal link and asset reference in www/ resolves to a file; a page nothing links to fails
  4. every page has its .md twin and appears in llms.txt
  5. no page loads a script, stylesheet or font from another origin
  6. the leak tripwire: sgit private credential shapes, private key markers, cloud and provider key prefixes, in every tracked file
  7. no em-dash in prose; unsupported absolutes are an advisory
  8. the version is one number in one place: tools/version.json agrees with website/data/versions.json and every page
"""
import json
import re
import subprocess
import sys

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WWW  = ROOT / 'www'
TRIPWIRE = [
    (r'sgit_private_(vault|read)_[A-Za-z0-9]{8,}:[a-z0-9]{4,24}', 'an sgit private credential'),
    (r'sgit_vk1_[A-Za-z0-9]{8,}:[a-z0-9]{4,24}', 'a legacy sgit vault key'),
    (r'-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY', 'a private key block'),
    (r'\bAKIA[0-9A-Z]{16}\b', 'an AWS access key id'),
    (r'\bsk-or-v1-[0-9a-f]{32,}', 'an OpenRouter key'),
    (r'\bsk-ant-[A-Za-z0-9_-]{20,}', 'an Anthropic key'),
    (r'\bsk-[A-Za-z0-9]{32,}\b', 'an OpenAI-shaped key'),
    (r'\bghp_[A-Za-z0-9]{30,}\b', 'a GitHub token'),
    (r'\bxox[baprs]-[A-Za-z0-9-]{10,}', 'a Slack token'),
    (r'"token"\s*:\s*"[A-Za-z0-9_-]{24,}"', 'a token value in JSON'),
]
ABSOLUTES = [r'\bnobody has\b', r'\bthe first to\b', r'\bnever scaled\b', r'\bimpossible to\b', r'\bperfectly secure\b', r'\bunhackable\b', r'\bmilitary[- ]grade\b']
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', '_site'}
QUOTED = '["\u201c\u2018\']\\s*'     # an absolute inside quotes is being named, not claimed


def tracked():
    out = subprocess.run(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT, capture_output=True, text=True).stdout
    return [ROOT / f for f in out.split('\0') if f and (ROOT / f).is_file()]


class Gate:

    def __init__(self):
        self.failures = []
        self.advisories = []

    def fail(self, msg): self.failures.append(msg)

    def run_step(self, label, argv):
        print(f'== {label}')
        r = subprocess.run(argv, cwd=ROOT)
        if r.returncode != 0: self.fail(f'{label} (exit {r.returncode})')

    def syntax(self):
        print('== syntax: node --check, py_compile')
        for f in tracked():
            if f.suffix in ('.js', '.mjs') and 'vendor' not in f.parts and 'www' not in f.parts:
                r = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True)
                if r.returncode: self.fail(f'node --check {f.relative_to(ROOT)}: {r.stderr.strip()[:200]}')
            if f.suffix == '.py':
                r = subprocess.run([sys.executable, '-m', 'py_compile', str(f)], capture_output=True, text=True)
                if r.returncode: self.fail(f'py_compile {f.relative_to(ROOT)}: {r.stderr.strip()[:200]}')

    def links(self):
        print('== links, twins, llms.txt, origins')
        pages = sorted(p for p in WWW.rglob('*.html'))
        linked = set()
        llms = (WWW / 'llms.txt').read_text(encoding='utf-8') if (WWW / 'llms.txt').exists() else ''
        for page in pages:
            text = page.read_text(encoding='utf-8')
            rel = page.relative_to(WWW).as_posix()
            twin = page.with_suffix('.md')
            if rel == '404.html': continue
            if not twin.exists(): self.fail(f'{rel}: no markdown twin')
            elif '(/' + twin.relative_to(WWW).as_posix() + ')' not in llms: self.fail(f'{rel}: twin not in llms.txt')
            for m in re.finditer(r'(?:href|src)="([^"]+)"', text):
                ref = m.group(1)
                if ref.startswith(('http://', 'https://', 'mailto:', 'data:', 'javascript:', '#', 'blob:')):
                    if re.search(r'<(script|link)[^>]*(src|href)="' + re.escape(ref), text) and not ref.startswith(('data:',)):
                        tag = re.search(r'<(script|link)[^>]*(src|href)="' + re.escape(ref) + '"[^>]*>', text).group(0)
                        if 'rel="canonical"' in tag or 'rel="license"' in tag or 'rel="alternate"' in tag or 'rel="me"' in tag: continue
                        if ref.startswith('https://api.send.sgit.ai/') and 'type="module"' in tag: continue   # the pinned release, checked by the manifest step
                        self.fail(f'{rel}: loads from another origin: {ref[:80]}')
                    continue
                path = ref.split('#')[0].split('?')[0]
                if not path: continue
                target = (WWW / path.lstrip('/')) if path.startswith('/') else (page.parent / path)
                if re.match(r'^/v\d+\.\d+\.\d+/', path): target = ROOT / 'releases' / path.lstrip('/')     # a release directory, served beside www/
                if path == '/releases.json': continue                                                       # written by release.py site
                target = target.resolve()
                if target.is_dir(): target = target / 'index.html'
                if not target.exists(): self.fail(f'{rel}: broken reference {ref}')
                else:
                    try: linked.add(target.relative_to(WWW.resolve()).as_posix())
                    except ValueError: pass
        for page in pages:
            rel = page.relative_to(WWW).as_posix()
            if rel != 'index.html' and rel not in linked and rel != '404.html':
                self.fail(f'{rel}: no page links to it (an orphan is unpublished)')
        for p in WWW.rglob('*.md'):
            if not p.with_suffix('.html').exists() and p.name != 'README.md': self.fail(f'{p.relative_to(WWW)}: a twin without a page')

    def tripwire(self):
        print('== the leak tripwire')
        allow = set()
        allow_file = ROOT / 'tools' / 'tripwire-allow.txt'
        if allow_file.exists():
            allow = {l.split('#')[0].strip() for l in allow_file.read_text(encoding='utf-8').splitlines() if l.split('#')[0].strip()}
        for f in tracked():
            if f.suffix in ('.png', '.jpg', '.webp', '.woff2', '.ico', '.pdf') or f.name == 'tripwire-allow.txt': continue
            try: text = f.read_text(encoding='utf-8')
            except UnicodeDecodeError: continue
            for pat, what in TRIPWIRE:
                for m in re.finditer(pat, text):
                    if m.group(0) in allow: continue
                    self.fail(f'{f.relative_to(ROOT)}: looks like {what}: {m.group(0)[:24]}…')

    def prose(self):
        print('== prose: no em-dash; absolutes as an advisory')
        for f in tracked():
            if f.suffix not in ('.md', '.html', '.txt') or 'vendor' in f.parts or f.parts[-2:] == ('www', 'llms-full.txt'): continue
            if 'briefs' in f.parts and 'transcript' in f.name: continue    # the person's own words, published as spoken
            text = f.read_text(encoding='utf-8')
            for i, line in enumerate(text.splitlines(), 1):
                if '—' in line: self.fail(f'{f.relative_to(ROOT)}:{i}: em-dash in prose')
                for a in ABSOLUTES:
                    if re.search(a, line, re.I) and not re.search(QUOTED + a, line, re.I): self.advisories.append(f'{f.relative_to(ROOT)}:{i}: absolute: {re.search(a, line, re.I).group(0)}')

    def versions(self):
        print('== the version, in one place')
        v = json.loads((ROOT / 'tools' / 'version.json').read_text(encoding='utf-8'))
        data = json.loads((ROOT / 'website' / 'data' / 'versions.json').read_text(encoding='utf-8'))
        if not data['versions'] or data['versions'][0]['version'] != v['version']:
            self.fail(f"website/data/versions.json's newest entry is not {v['version']}")
        if not re.match(r'^v\d+\.\d+\.\d+$', v['version']): self.fail('tools/version.json: not vX.Y.Z')
        for page in WWW.rglob('*.html'):
            if page.name == '404.html': continue
            if f'data-version="{v["version"]}"' not in page.read_text(encoding='utf-8'):
                self.fail(f'{page.relative_to(WWW)}: does not show {v["version"]}')
        readme = (ROOT / 'README.md').read_text(encoding='utf-8')
        if v['version'] not in readme: self.advisories.append(f'README.md does not mention {v["version"]}')

    def run(self):
        self.run_step('python3 tools/build.py --check', [sys.executable, 'tools/build.py', '--check'])
        if (ROOT / 'tools' / 'release.py').exists(): self.run_step('python3 tools/release.py check', [sys.executable, 'tools/release.py', 'check'])
        self.syntax(); self.links(); self.tripwire(); self.prose(); self.versions()
        for a in self.advisories: print(f'advisory: {a}')
        for f in self.failures: print(f'FAIL: {f}')
        print(f'gate: {"PASSED" if not self.failures else "FAILED"} ({len(self.failures)} failure(s), {len(self.advisories)} advisory)')
        return 0 if not self.failures else 1


if __name__ == '__main__':
    sys.exit(Gate().run())
