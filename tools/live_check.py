#!/usr/bin/env python3
"""live_check.py: after a deploy, ask the live host for every file of the current release and compare each SHA-256
with the manifest; poll for up to ten minutes, because Pages takes a while and green does not mean live."""
import hashlib
import json
import sys
import time
import urllib.request

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HOST = 'https://api.send.sgit.ai'


def fetch(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return r.read()


if __name__ == '__main__':
    v = json.loads((ROOT / 'tools' / 'version.json').read_text(encoding='utf-8'))
    release = v['release']
    manifest = json.loads((ROOT / 'releases' / release / 'manifest.json').read_text(encoding='utf-8'))
    deadline = time.time() + 600
    while True:
        try:
            live = json.loads(fetch(f'{HOST}/releases.json'))
            if live.get('current') == release:
                break
            print(f'live says current={live.get("current")}, waiting for {release}')
        except Exception as e:
            print(f'not yet: {e}')
        if time.time() > deadline:
            sys.exit(f'the live host never served {release}')
        time.sleep(20)
    bad = 0
    for f, e in manifest['entries'].items():
        try:
            if hashlib.sha256(fetch(f'{HOST}/{release}/{f}')).hexdigest() != e['sha256']:
                print(f'differs: {f}'); bad += 1
        except Exception as err:
            print(f'missing: {f}: {err}'); bad += 1
    print(f'{len(manifest["entries"]) - bad} of {len(manifest["entries"])} files of {release} served as released')
    sys.exit(1 if bad else 0)
