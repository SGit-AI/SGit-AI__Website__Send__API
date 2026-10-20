#!/usr/bin/env python3
"""build.py: write www/ from website/ (python3 tools/build.py), or prove it is already what the build writes
(python3 tools/build.py --check), which is what CI does so the committed site and its sources cannot drift."""
import filecmp
import shutil
import sys
import tempfile

from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sitekit import Site, ROOT, WWW   # noqa: E402


def differences(a, b):
    out = []
    def walk(d):
        for name in d.left_only:  out.append(f'only in {a.name}: {Path(d.left) / name}')
        for name in d.right_only: out.append(f'only in {b.name}: {Path(d.right) / name}')
        for name in d.diff_files: out.append(f'differs: {Path(d.left).relative_to(a) / name}')
        for sub in d.subdirs.values(): walk(sub)
    walk(filecmp.dircmp(a, b))
    return out


if __name__ == '__main__':
    if '--check' in sys.argv:
        tmp = Path(tempfile.mkdtemp())
        Site().build(tmp / 'www')
        if not WWW.exists():
            sys.exit('www/ does not exist: run python3 tools/build.py')
        diffs = differences(WWW, tmp / 'www')
        shutil.rmtree(tmp)
        if diffs:
            print('\n'.join(diffs)); sys.exit('www/ is not what tools/build.py writes: run python3 tools/build.py and commit')
        print('www/ is what the build writes')
    else:
        pages = Site().build()
        print(f'built {len(pages)} pages into www/')
