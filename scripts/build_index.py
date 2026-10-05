#!/usr/bin/env python3
"""Build tonos/index.json from the MEIs + status.json.

The MEI is the source of truth for the musical facts (title, authors, organic);
status.json only carries how far along the edition of each tono is: the state of
each phase (see PHASES). This script derives the display fields from each tono's
MEI, decides from its perfRes which phases apply, validates and merges that progress,
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

# Edition phases, in working order. Which of the conditional ones apply is
# derived from the MEI (see applicable_phases), never written in status.json.
PHASES = [
    'text', 'text_review',
    'music', 'music_review',
    'voice', 'voice_review',
    'guion', 'guion_review',
    'full_review',
    'facsimile',
    'external_review',
    'intro',
]
STATES = ('pending', 'in_progress', 'done')
NA = 'n/a'


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
    return organic, reconstructed, incomplete, fragmentary, voces, acomp


def applicable_phases(voces, acomp):
    """Phases that apply to a tono, from the perfRes states.

    A sung voice that is lost, fragmentary or already reconstructed needs the
    voice reconstruction. The guion needs it when it is lost or reconstructed,
    or when the MEI has no guion at all (every tono gets one). Anything
    reconstructed needs the full musical review of the result."""
    voice = any(s in ('lost', 'fragmentary', 'reconstructed') for _, s in voces)
    guion = not acomp or any(s in ('lost', 'reconstructed') for _, s in acomp)
    conditional = {
        'voice': voice, 'voice_review': voice,
        'guion': guion, 'guion_review': guion,
        'full_review': voice or guion,
    }
    return {p for p in PHASES if conditional.get(p, True)}


def merge_phases(number, declared, applicable, voces, acomp):
    """Full phase map for the index: the states declared in status.json
    (missing ones are pending) with n/a for the phases that do not apply.
    Raises ValueError on states that contradict the MEI."""
    unknown = set(declared) - set(PHASES)
    if unknown:
        raise ValueError(f"tono {number}: fases desconocidas {sorted(unknown)}")
    phases = {}
    for p in PHASES:
        state = declared.get(p, 'pending')
        if state not in STATES:
            raise ValueError(f"tono {number}: estado «{state}» no válido en {p}")
        if p not in applicable:
            if p in declared:
                raise ValueError(f"tono {number}: {p} no aplica según el MEI "
                                 f"y status.json dice «{state}»")
            state = NA
        phases[p] = state

    for phase, parts in (('voice', voces), ('guion', acomp)):
        if any(s == 'reconstructed' for _, s in parts) and phases[phase] == 'pending':
            print(f"aviso: el tono {number} tiene {phase} reconstruido en el MEI "
                  f"y status.json lo da por pendiente", file=sys.stderr)
    return phases


def summarize(phases):
    """progress (done counts 1, in progress 1/2), next phase and completion."""
    states = [s for s in phases.values() if s != NA]
    progress = (states.count('done') + 0.5 * states.count('in_progress')) / len(states)
    next_phase = next((p for p, s in phases.items() if s not in (NA, 'done')), None)
    return round(progress, 3), next_phase, next_phase is None


def build_entry(number, score, status):
    mei_path = Path('tonos') / score['path'] / score['meiFile']
    root = ET.parse(str(mei_path)).getroot()

    title = first_text(root, '//mei:titleStmt/mei:title[@type="main"]/text()') or score['title']
    music_author = first_text(root, '//mei:composer/mei:persName/text()') or ANON
    text_author = first_text(root, '//mei:lyricist/mei:persName/text()') or ANON
    organic, reconstructed, incomplete, fragmentary, voces, acomp = derive_organic(root)
    phases = merge_phases(number, status.get('phases', {}),
                          applicable_phases(voces, acomp), voces, acomp)
    progress, next_phase, complete = summarize(phases)

    return {
        'path': score['path'],
        'title': title,
        'music_author': music_author,
        'text_author': text_author,
        'organic': organic,
        'reconstructed': reconstructed,
        'incomplete': incomplete,
        'fragmentary': fragmentary,
        'phases': phases,
        'progress': progress,
        'next_phase': next_phase,
        'complete': complete,
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
        entry = build_entry(number, sc, status.get(number, {}))
        out.append({'number': number, **entry})
    return out


def render(index):
    return json.dumps(index, ensure_ascii=False, indent=2) + "\n"


def main():
    try:
        index = build_index()
    except ValueError as e:
        sys.exit(f"error: {e}")
    if '--stdout' in sys.argv:  # used by the pre-commit hook to compare
        sys.stdout.write(render(index))
        return
    INDEX_JSON.write_text(render(index))
    print(f"Escrito {INDEX_JSON} ({len(index)} tonos)")


if __name__ == '__main__':
    main()
