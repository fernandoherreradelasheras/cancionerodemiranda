#!/usr/bin/env python3
"""Build tonos/index.json from the MEIs + status.json.

The MEI is the source of truth for the musical facts (title, authors, organic);
status.json only carries how far along the edition of each tono is. This script
derives the display fields from each tono's MEI and merges that progress,
producing a committed index that the web-app's list view and the PDF pipeline
can read cheaply (without parsing 77 MEIs at runtime).

Usage:
    python scripts/build_index.py            # write tonos/index.json
    python scripts/build_index.py --stdout   # print it instead (pre-commit hook)
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
    """Voice name carrying its editorial state.

    The brackets answer who wrote it: [x] supplied by the edition, (x) in the
    organic but absent from the source. The asterisk answers a different
    question — how much of it survives — so it does not reuse either pair."""
    if state == 'reconstructed':
        return f'[{name}]'
    if state == 'lost':
        return f'({name})'
    if state == 'fragmentary':
        return f'{name}*'
    return name


def derive_organic(root):
    """Organic from meiHead/.../perfMedium/perfResList. Each <perfRes> is a voice
    (or the accompaniment, detected by name), with @type in {reconstructed, lost,
    fragmentary}. Returns (organic_string, reconstructed, incomplete, fragmentary).

    The list is bare — "Tiple 1º, Tiple 2º, [Alto], Tenor y guion" — with no
    voice count and no parenthesised clauses: a parenthesis here means a lost
    voice and nothing else."""
    res = root.xpath('//mei:perfMedium/mei:perfResList/mei:perfRes', namespaces=NSMAP)
    voces, acomp = [], []
    for pr in res:
        name = (pr.text or '').strip()
        state = pr.get('type')  # None | 'reconstructed' | 'lost' | 'fragmentary'
        (acomp if is_accompaniment(name) else voces).append((name, state))

    organic = ', '.join(_fmt_res(n, s) for n, s in voces)
    if acomp:
        # The accompaniment carries its own state, like any other part.
        names = ', '.join(_fmt_res('guion' if is_accompaniment(n) else n.lower(), s)
                          for n, s in acomp)
        organic = f'{organic} y {names}' if organic else names

    reconstructed = any(s == 'reconstructed' for _, s in voces + acomp)
    fragmentary = any(s == 'fragmentary' for _, s in voces + acomp)
    # A voice preserved only in fragments is as much an incomplete testimony as
    # one missing outright.
    incomplete = any(s in ('lost', 'fragmentary') for _, s in voces + acomp)
    return organic, reconstructed, incomplete, fragmentary


def build_entry(score, status):
    mei_path = Path('tonos') / score['path'] / score['meiFile']
    root = ET.parse(str(mei_path)).getroot()

    title = first_text(root, '//mei:titleStmt/mei:title[@type="main"]/text()') or score['title']
    music_author = first_text(root, '//mei:composer/mei:persName/text()') or ANON
    text_author = first_text(root, '//mei:lyricist/mei:persName/text()') or ANON
    organic, reconstructed, incomplete, fragmentary = derive_organic(root)

    return {
        'path': score['path'],
        'title': title,
        'music_author': music_author,
        'text_author': text_author,
        'organic': organic,
        'reconstructed': reconstructed,
        'incomplete': incomplete,
        'fragmentary': fragmentary,
        'status_text': status.get('status_text'),
        'status_music': status.get('status_music'),
    }


def build_index():
    scores = json.loads(TONOS_JSON.read_text())['scores']
    # status.json only carries the edition progress, keyed by tono number.
    status = {e['number']: e for e in json.loads(STATUS_JSON.read_text())}
    out = []
    for i, sc in enumerate(scores):
        number = i + 1
        if number not in status:
            print(f"aviso: el tono {number} no tiene entrada en {STATUS_JSON}",
                  file=sys.stderr)
        entry = build_entry(sc, status.get(number, {}))
        out.append({'number': number, **entry})
    return out


def render(index):
    return json.dumps(index, ensure_ascii=False, indent=2) + "\n"


def main():
    index = build_index()
    if '--stdout' in sys.argv:  # used by the pre-commit hook to compare
        sys.stdout.write(render(index))
        return
    INDEX_JSON.write_text(render(index))
    print(f"Escrito {INDEX_JSON} ({len(index)} tonos)")


if __name__ == '__main__':
    main()
