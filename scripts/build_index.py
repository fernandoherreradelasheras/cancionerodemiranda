#!/usr/bin/env python3
"""Build tonos/index.json from the MEIs + status.json.

The MEI is the source of truth for the musical facts (title, authors, organic);
status.json only carries the edition state. This script derives the display
fields from each tono's MEI and merges the state, producing a committed index
that the web-app's list view and the PDF pipeline can read cheaply (without
parsing 77 MEIs at runtime).

Usage:
    python scripts/build_index.py            # write tonos/index.json
    python scripts/build_index.py --check    # compare against status.json, list diffs, exit 1 on any
"""

import json
import sys
import unicodedata
from pathlib import Path

from lxml import etree as ET

MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {'mei': MEI_NS}
ANON = '[Anónimo]'

TONOS_JSON = Path('tonos/tonos.json')
STATUS_JSON = Path('tonos/status.json')
INDEX_JSON = Path('tonos/index.json')


def first_text(root, xpath):
    r = root.xpath(xpath, namespaces=NSMAP)
    return r[0].strip() if r and r[0] and r[0].strip() else None


def is_accompaniment(label):
    base = unicodedata.normalize('NFKD', label).encode('ascii', 'ignore').decode().lower()
    return base.startswith('guion')


def _fmt_res(name, state):
    if state == 'reconstructed':
        return f'[{name}]'
    if state == 'lost':
        return f'({name})'
    return name


def derive_organic(root):
    """Organic from meiHead/.../perfMedium/perfResList. Each <perfRes> is a voice
    (or the accompaniment, detected by name), with @type in {reconstructed, lost}.
    Returns (organic_string, reconstructed_bool, incomplete_bool)."""
    res = root.xpath('//mei:perfMedium/mei:perfResList/mei:perfRes', namespaces=NSMAP)
    voces, acomp = [], []
    for pr in res:
        name = (pr.text or '').strip()
        state = pr.get('type')  # None | 'reconstructed' | 'lost'
        (acomp if is_accompaniment(name) else voces).append((name, state))

    organic = f'{len(voces)} voces ({", ".join(_fmt_res(n, s) for n, s in voces)})'
    if acomp:
        names = ', '.join('guion' if is_accompaniment(n) else n.lower() for n, _ in acomp)
        clause = f'y acompañamiento ({names})'
        acc_states = {s for _, s in acomp}
        # An edited accompaniment marks the whole clause, not the individual name.
        if 'reconstructed' in acc_states:
            clause = f'[{clause}]'
        elif 'lost' in acc_states:
            clause = f'({clause})'
        organic += ' ' + clause

    reconstructed = any(s == 'reconstructed' for _, s in voces + acomp)
    incomplete = any(s == 'lost' for _, s in voces + acomp)
    return organic, reconstructed, incomplete


def build_entry(score, status):
    mei_path = Path('tonos') / score['path'] / score['meiFile']
    root = ET.parse(str(mei_path)).getroot()

    title = first_text(root, '//mei:titleStmt/mei:title[@type="main"]/text()') or score['title']
    music_author = first_text(root, '//mei:composer/mei:persName/text()') or ANON
    text_author = first_text(root, '//mei:lyricist/mei:persName/text()') or ANON
    organic, reconstructed, incomplete = derive_organic(root)

    return {
        'path': score['path'],
        'title': title,
        'music_author': music_author,
        'text_author': text_author,
        'organic': organic,
        'reconstructed': reconstructed,
        'incomplete': incomplete,
        'status_text': status.get('status_text'),
        'status_music': status.get('status_music'),
    }


def build_index():
    scores = json.loads(TONOS_JSON.read_text())['scores']
    status = json.loads(STATUS_JSON.read_text())
    out = []
    for i, sc in enumerate(scores):
        entry = build_entry(sc, status[i] if i < len(status) else {})
        entry = {'number': i + 1, **entry}  # keep 'number' (status.json had it) for the web
        out.append(entry)
    return out


def norm_author(a):
    return ANON if (a or '') in ('Anónimo', '') else a


def check_against_status(index):
    """Report where the MEI-derived fields disagree with status.json (the
    current source of truth) — i.e. the backfill worklist."""
    status = json.loads(STATUS_JSON.read_text())
    diffs = 0
    for i, entry in enumerate(index):
        st = status[i] if i < len(status) else {}
        n = i + 1
        if entry['music_author'] != norm_author(st.get('music_author')):
            print(f"tono {n}: music_author MEI={entry['music_author']!r} status={st.get('music_author')!r}")
            diffs += 1
        if entry['text_author'] != norm_author(st.get('text_author')):
            print(f"tono {n}: text_author MEI={entry['text_author']!r} status={st.get('text_author')!r}")
            diffs += 1
        # organic: compare ignoring the guion-accent normalization
        if entry['organic'].replace('guión', 'guion') != (st.get('organic') or '').replace('guión', 'guion'):
            print(f"tono {n}: organic\n   MEI   ={entry['organic']!r}\n   status={st.get('organic')!r}")
            diffs += 1
    print(f"\n{diffs} discrepancia(s) MEI vs status.json")
    return diffs


def render(index):
    return json.dumps(index, ensure_ascii=False, indent=2) + "\n"


def main():
    index = build_index()
    if '--check' in sys.argv:
        sys.exit(1 if check_against_status(index) else 0)
    if '--stdout' in sys.argv:  # used by the pre-commit hook to compare
        sys.stdout.write(render(index))
        return
    INDEX_JSON.write_text(render(index))
    print(f"Escrito {INDEX_JSON} ({len(index)} tonos)")


if __name__ == '__main__':
    main()
