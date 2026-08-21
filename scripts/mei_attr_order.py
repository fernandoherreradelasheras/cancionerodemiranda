#!/usr/bin/env python3
"""
mei_attr_order.py

Checks (and optionally normalises) the order in which attributes are written
in the project MEI files.

Attribute order is semantically irrelevant in XML, but a stable, predictable
order makes the files far easier to read, to diff and to review. This script
defines a preferred order for the most commonly used MEI elements, reports how
much of the corpus already complies with it, and -- with --update -- rewrites
the files so that they do.

The rewrite is purely textual: only the attributes inside a start tag are
permuted. Indentation, line breaks, quoting style, comments, processing
instructions and entity escapes are preserved byte for byte, so the resulting
diff contains nothing but the reordering itself.

Usage:
    python mei_attr_order.py                      # check every project MEI file
    python mei_attr_order.py --by-file            # add a per-file breakdown
    python mei_attr_order.py --show 5             # show example divergences
    python mei_attr_order.py --update             # rewrite the files in place
    python mei_attr_order.py --spec               # print the preferred order
    python mei_attr_order.py file.mei [file.mei]  # check specific files

With no file arguments the file list is taken from get-tonos-mei.sh, which
lives next to this script.

Exit status (--check turns divergence into a failure, for use in hooks and CI):
    0  everything analysed complies
    1  at least one tag diverges (only reported as a failure with --check)
    2  at least one file could not be processed
"""

import argparse
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

from lxml import etree


# ---------------------------------------------------------------------------
# Preferred attribute order
# ---------------------------------------------------------------------------
#
# GLOBAL_ORDER is the fallback ranking, applied to every element and to any
# attribute an element-specific rule does not mention. It is grouped by role:
# what the thing *is*, what it *refers to*, where it *lives*, what it *sounds
# like* and, last, what it *looks like*.

GLOBAL_ORDER = [
    # identity
    'xml:id',
    # references to other elements
    'copyof', 'corresp', 'sameas', 'synch', 'next', 'prev',
    # classification and naming
    'type', 'subtype', 'func', 'label', 'n', 'class',
    # editorial responsibility and evidence
    'source', 'resp', 'cert', 'evidence', 'reason', 'agent', 'hand',
    # links to other content
    'decls', 'plist', 'target',
    # attachment to the musical surface
    'part', 'partstaff', 'staff', 'layer',
    'tstamp', 'tstamp2', 'startid', 'endid',
    # event content: duration, then pitch, then stems and event-level ties
    'dur', 'dur.ppq', 'dots', 'grace', 'grace.time',
    'pname', 'accid', 'accid.ges', 'oct', 'oct.ges', 'oloc', 'ploc',
    'stem.dir', 'stem.len', 'stem.mod', 'stem.pos',
    'tie', 'artic', 'beam', 'num', 'numbase',
    # syllable and verse text
    'wordpos', 'con',
    # score and staff definitions
    'lines', 'shape', 'line', 'dis', 'dis.place',
    'clef.shape', 'clef.line', 'clef.dis', 'clef.dis.place',
    'sig', 'keysig', 'meter.count', 'meter.unit', 'meter.sym',
    'midi.bpm', 'midi.instrnum', 'midi.channel',
    'trans.diat', 'trans.semi', 'optimize',
    # structure
    'left', 'right', 'restart', 'form', 'symbol', 'bar.thru',
    # appearance and placement
    'place', 'curvedir', 'lform', 'lwidth', 'lendsym', 'enclose',
    'glyph.auth', 'glyph.name', 'altsym',
    'halign', 'valign', 'ho', 'vo', 'x', 'y',
    'color', 'fontfam', 'fontname', 'fontsize', 'fontstyle', 'fontweight',
    'rend', 'visible',
    # document level and header
    'meiversion', 'isodate', 'auth', 'auth.uri', 'role', 'xml:lang',
]

# ELEMENT_ORDER overrides GLOBAL_ORDER for the elements that carry most of the
# corpus. Attributes listed here always come first, in this order; anything
# else falls back to GLOBAL_ORDER. Every rule starts with xml:id.

ELEMENT_ORDER = {
    # --- events -----------------------------------------------------------
    'note': ['xml:id', 'dur', 'dots', 'pname', 'accid', 'accid.ges', 'oct',
             'stem.dir', 'stem.len', 'stem.mod', 'tie', 'artic', 'grace',
             'color'],
    'chord': ['xml:id', 'dur', 'dots', 'stem.dir', 'stem.len', 'artic'],
    'rest': ['xml:id', 'dur', 'dots', 'oloc', 'ploc'],
    'mRest': ['xml:id', 'dur'],
    'space': ['xml:id', 'dur', 'dots'],
    'accid': ['xml:id', 'accid', 'accid.ges', 'func', 'enclose', 'place',
              'color'],
    'artic': ['xml:id', 'artic', 'place'],
    'syl': ['xml:id', 'con', 'wordpos'],
    'verse': ['xml:id', 'n', 'place'],

    # --- control events: where it attaches, then what it is, then how it
    #     is drawn -----------------------------------------------------------
    'tie': ['xml:id', 'staff', 'layer', 'startid', 'endid',
            'curvedir', 'lform', 'color'],
    'slur': ['xml:id', 'staff', 'layer', 'startid', 'endid',
             'curvedir', 'lform', 'color'],
    'phrase': ['xml:id', 'staff', 'layer', 'startid', 'endid',
               'curvedir', 'lform', 'color'],
    'bracketSpan': ['xml:id', 'staff', 'layer', 'startid', 'endid',
                    'func', 'lform', 'lwidth', 'color'],
    'hairpin': ['xml:id', 'staff', 'layer', 'tstamp', 'tstamp2',
                'startid', 'endid', 'form', 'place', 'color'],
    'octave': ['xml:id', 'staff', 'layer', 'startid', 'endid',
               'dis', 'dis.place', 'color'],
    'gliss': ['xml:id', 'staff', 'layer', 'startid', 'endid', 'color'],
    'fermata': ['xml:id', 'staff', 'layer', 'tstamp', 'startid',
                'form', 'place', 'color'],
    'dir': ['xml:id', 'label', 'staff', 'layer', 'tstamp',
            'startid', 'endid', 'place', 'color'],
    'dynam': ['xml:id', 'label', 'staff', 'layer', 'tstamp',
              'startid', 'endid', 'place', 'color'],
    'tempo': ['xml:id', 'label', 'staff', 'layer', 'tstamp',
              'startid', 'midi.bpm', 'place', 'color'],
    'harm': ['xml:id', 'type', 'n', 'staff', 'layer', 'tstamp',
             'startid', 'place', 'color'],
    'repeatMark': ['xml:id', 'func', 'staff', 'layer', 'tstamp',
                   'startid', 'place'],

    # --- containers -------------------------------------------------------
    'measure': ['xml:id', 'n', 'left', 'right'],
    'staff': ['xml:id', 'n'],
    'layer': ['xml:id', 'n'],
    'section': ['xml:id', 'label', 'restart'],
    'ending': ['xml:id', 'n', 'label'],
    'barLine': ['xml:id', 'form'],

    # --- definitions ------------------------------------------------------
    'scoreDef': ['xml:id', 'keysig', 'meter.count', 'meter.unit', 'meter.sym',
                 'midi.bpm', 'optimize'],
    'staffDef': ['xml:id', 'n', 'lines',
                 'clef.shape', 'clef.line', 'clef.dis', 'clef.dis.place',
                 'keysig', 'trans.diat', 'trans.semi'],
    'staffGrp': ['xml:id', 'n', 'symbol', 'bar.thru'],
    'clef': ['xml:id', 'copyof', 'corresp', 'shape', 'line',
             'dis', 'dis.place'],
    'keySig': ['xml:id', 'sig'],
    'instrDef': ['xml:id', 'midi.instrnum', 'midi.channel'],
    'symbol': ['xml:id', 'glyph.auth', 'glyph.name'],

    # --- editorial apparatus ----------------------------------------------
    'app': ['xml:id', 'type'],
    'lem': ['xml:id', 'type', 'label', 'n', 'class', 'corresp', 'source', 'resp', 'cert'],
    'rdg': ['xml:id', 'type', 'label', 'n', 'class', 'corresp', 'source', 'resp', 'cert'],
    'choice': ['xml:id', 'type'],
    'annot': ['xml:id', 'type', 'n', 'plist', 'resp'],
    # <corr>, <sic> and friends share one rule: what it is, why, and who says so
    'corr': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
             'evidence', 'agent'],
    'sic': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
            'evidence', 'agent'],
    'orig': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
             'evidence', 'agent'],
    'reg': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
            'evidence', 'agent'],
    'unclear': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
                'evidence', 'agent'],
    'supplied': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
                 'evidence', 'agent'],
    'add': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
            'evidence', 'agent'],
    'del': ['xml:id', 'label', 'reason', 'resp', 'cert', 'source',
            'evidence', 'agent'],

    # --- text and header --------------------------------------------------
    'lg': ['xml:id', 'type', 'n', 'label', 'corresp', 'decls'],
    'l': ['xml:id', 'n', 'label'],
    'div': ['xml:id', 'type', 'n'],
    'rend': ['xml:id', 'label', 'rend', 'halign', 'valign',
             'fontfam', 'fontname', 'fontsize', 'fontstyle', 'fontweight',
             'color'],
    'source': ['xml:id', 'n', 'type', 'label'],
    'title': ['xml:id', 'type'],
    'identifier': ['xml:id', 'type', 'auth', 'auth.uri'],
    'persName': ['xml:id', 'type', 'role', 'auth'],
    'corpName': ['xml:id', 'type', 'role', 'auth'],
    'name': ['xml:id', 'type', 'role', 'auth'],
    'date': ['xml:id', 'isodate'],
    'perfRes': ['xml:id', 'type', 'label'],
    'mei': ['xml:id', 'meiversion'],
}


def check_spec():
    """Sanity-check the tables above: xml:id must lead every element rule."""
    problems = []
    for elem, order in ELEMENT_ORDER.items():
        if order[0] != 'xml:id':
            problems.append(f"{elem}: does not start with xml:id")
        if len(set(order)) != len(order):
            problems.append(f"{elem}: repeated attribute in the rule")
    if len(set(GLOBAL_ORDER)) != len(GLOBAL_ORDER):
        dups = [a for a, c in Counter(GLOBAL_ORDER).items() if c > 1]
        problems.append(f"GLOBAL_ORDER: repeated attributes {dups}")
    if problems:
        sys.exit("Invalid ordering spec:\n  " + "\n  ".join(problems))


GLOBAL_RANK = {attr: i for i, attr in enumerate(GLOBAL_ORDER)}
ELEMENT_RANK = {elem: {attr: i for i, attr in enumerate(order)}
                for elem, order in ELEMENT_ORDER.items()}

# Ranking groups: namespace declarations, then the element rule, then the
# global fallback, then whatever the spec does not know about.
_G_NS, _G_ELEMENT, _G_GLOBAL, _G_UNKNOWN = -1, 0, 1, 2


def is_ns_decl(attr):
    return attr == 'xmlns' or attr.startswith('xmlns:')


def rank(elem, attr):
    if is_ns_decl(attr):
        return (_G_NS, 0)
    elem_rank = ELEMENT_RANK.get(elem)
    if elem_rank is not None and attr in elem_rank:
        return (_G_ELEMENT, elem_rank[attr])
    if attr in GLOBAL_RANK:
        return (_G_GLOBAL, GLOBAL_RANK[attr])
    return (_G_UNKNOWN, 0)


def is_known(elem, attr):
    if is_ns_decl(attr):
        return True
    elem_rank = ELEMENT_RANK.get(elem)
    return (elem_rank is not None and attr in elem_rank) or attr in GLOBAL_RANK


def sort_attrs(elem, attrs):
    """Sort (name, raw_text) pairs. The sort is stable, so attributes the spec
    does not know about keep their relative order at the end of the tag."""
    return sorted(attrs, key=lambda a: rank(elem, a[0]))


# ---------------------------------------------------------------------------
# Start-tag scanner
# ---------------------------------------------------------------------------
#
# lxml would happily reorder attributes for us, but writing the tree back
# reflows the whole document. Since the files are hand-edited and reviewed as
# diffs, we edit the raw text instead and touch nothing but the start tags.

NAME_RE = re.compile(r'[^\s/>=]+')
WS = ' \t\r\n'


class StartTag:
    """A start tag broken into the pieces needed to rebuild it verbatim:

        '<' name  seps[0] attrs[0]  seps[1] attrs[1] ...  trail close
    """

    __slots__ = ('name', 'attrs', 'seps', 'trail', 'close', 'start', 'end')

    def __init__(self, name, attrs, seps, trail, close, start, end):
        self.name = name
        self.attrs = attrs      # list of (attr_name, raw 'name="value"' text)
        self.seps = seps        # whitespace preceding each attribute
        self.trail = trail      # whitespace before '>' or '/>'
        self.close = close
        self.start = start
        self.end = end

    @property
    def local_name(self):
        return self.name.rsplit(':', 1)[-1]

    def render(self, attrs):
        out = ['<', self.name]
        for sep, attr in zip(self.seps, attrs):
            out.append(sep)
            out.append(attr[1])
        out.append(self.trail)
        out.append(self.close)
        return ''.join(out)

    @property
    def text(self):
        return self.render(self.attrs)


class MalformedTag(Exception):
    pass


def _skip_ws(text, i):
    while i < len(text) and text[i] in WS:
        i += 1
    return i


def parse_start_tag(text, start):
    """Parse the start tag beginning at text[start] == '<'."""
    m = NAME_RE.match(text, start + 1)
    if not m:
        raise MalformedTag(f"unnamed tag at offset {start}")
    name = m.group(0)
    i = m.end()
    attrs, seps = [], []

    while True:
        ws_start = i
        i = _skip_ws(text, i)
        ws = text[ws_start:i]
        if i >= len(text):
            raise MalformedTag(f"unterminated tag at offset {start}")

        if text[i] == '>':
            return StartTag(name, attrs, seps, ws, '>', start, i + 1)
        if text.startswith('/>', i):
            return StartTag(name, attrs, seps, ws, '/>', start, i + 2)
        if not ws:
            raise MalformedTag(f"missing space before attribute at offset {i}")

        m = NAME_RE.match(text, i)
        if not m:
            raise MalformedTag(f"bad attribute name at offset {i}")
        attr_name = m.group(0)
        j = _skip_ws(text, m.end())
        if j >= len(text) or text[j] != '=':
            raise MalformedTag(f"attribute without value at offset {i}")
        j = _skip_ws(text, j + 1)
        if j >= len(text) or text[j] not in '"\'':
            raise MalformedTag(f"unquoted attribute value at offset {j}")
        end_quote = text.find(text[j], j + 1)
        if end_quote < 0:
            raise MalformedTag(f"unterminated attribute value at offset {j}")

        attrs.append((attr_name, text[i:end_quote + 1]))
        seps.append(ws)
        i = end_quote + 1


def iter_start_tags(text):
    """Yield every start tag in document order, skipping comments, CDATA
    sections, processing instructions, declarations and end tags."""
    i = 0
    n = len(text)
    while True:
        i = text.find('<', i)
        if i < 0:
            return
        if text.startswith('<!--', i):
            i = text.index('-->', i) + 3
        elif text.startswith('<![CDATA[', i):
            i = text.index(']]>', i) + 3
        elif text.startswith('<?', i):
            i = text.index('?>', i) + 2
        elif text.startswith('<!', i):
            i = text.index('>', i) + 1
        elif text.startswith('</', i):
            i = text.index('>', i) + 1
        elif i + 1 < n and text[i + 1] not in WS:
            tag = parse_start_tag(text, i)
            yield tag
            i = tag.end
        else:
            i += 1


# ---------------------------------------------------------------------------
# Per-file processing
# ---------------------------------------------------------------------------

class Stats:
    def __init__(self):
        self.instances = Counter()      # element -> tags seen
        self.orderable = Counter()      # element -> tags with 2+ attributes
        self.divergent = Counter()      # element -> tags in the wrong order
        self.unknown = Counter()        # (element, attr) -> occurrences

    def merge(self, other):
        self.instances.update(other.instances)
        self.orderable.update(other.orderable)
        self.divergent.update(other.divergent)
        self.unknown.update(other.unknown)

    @property
    def total_orderable(self):
        return sum(self.orderable.values())

    @property
    def total_divergent(self):
        return sum(self.divergent.values())


def read_text(path):
    # newline='' keeps the original line endings out of Python's translation.
    with open(path, 'r', encoding='utf-8', newline='') as f:
        return f.read()


def process_file(path, collect_examples=0):
    """Return (stats, new_text, examples). new_text is None if already compliant."""
    text = read_text(path)
    stats = Stats()
    examples = []
    pieces = []
    prev_end = 0
    changed = False

    for tag in iter_start_tags(text):
        elem = tag.local_name
        stats.instances[elem] += 1
        for attr_name, _ in tag.attrs:
            if not is_known(elem, attr_name):
                stats.unknown[(elem, attr_name)] += 1
        if len(tag.attrs) < 2:
            continue
        stats.orderable[elem] += 1

        wanted = sort_attrs(elem, tag.attrs)
        if [a[0] for a in wanted] == [a[0] for a in tag.attrs]:
            continue

        stats.divergent[elem] += 1
        if len(examples) < collect_examples:
            line = text.count('\n', 0, tag.start) + 1
            examples.append((elem, line, tag.text, tag.render(wanted)))

        pieces.append(text[prev_end:tag.start])
        pieces.append(tag.render(wanted))
        prev_end = tag.end
        changed = True

    if not changed:
        return stats, None, examples

    pieces.append(text[prev_end:])
    return stats, ''.join(pieces), examples


def same_document(before, after):
    """Canonical XML sorts attributes, so two documents that differ only in
    attribute order canonicalise to exactly the same bytes."""
    c14n = lambda s: etree.canonicalize(xml_data=s, with_comments=True)
    return c14n(before) == c14n(after)


def write_text(path, text):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def pct(part, whole):
    return 100.0 * part / whole if whole else 100.0


def print_element_table(stats, min_instances):
    rows = []
    for elem, orderable in stats.orderable.items():
        if stats.instances[elem] < min_instances:
            continue
        divergent = stats.divergent[elem]
        rows.append((elem, stats.instances[elem], orderable,
                     orderable - divergent, divergent))
    rows.sort(key=lambda r: (-r[4], -r[2], r[0]))

    print(f"{'ELEMENT':<16}{'TOTAL':>10}{'ORDERABLE':>12}"
          f"{'COMPLIANT':>12}{'DIVERGENT':>12}{'COMPLIANCE':>12}")
    print('-' * 74)
    for elem, total, orderable, compliant, divergent in rows:
        print(f"{elem:<16}{total:>10}{orderable:>12}{compliant:>12}"
              f"{divergent:>12}{pct(compliant, orderable):>11.1f}%")

    orderable = stats.total_orderable
    divergent = stats.total_divergent
    compliant = orderable - divergent
    total = sum(stats.instances.values())
    print('-' * 74)
    print(f"{'TOTAL':<16}{total:>10}{orderable:>12}{compliant:>12}"
          f"{divergent:>12}{pct(compliant, orderable):>11.1f}%")


def print_spec():
    print("Preferred attribute order")
    print("=========================")
    print("\nPer element (these attributes come first, in this order):\n")
    for elem in sorted(ELEMENT_ORDER):
        print(f"  {elem:<14} {' '.join(ELEMENT_ORDER[elem])}")
    print("\nFallback order for everything else:\n")
    print('  ' + ' '.join(GLOBAL_ORDER))
    print("\nAttributes absent from both lists are left in their original")
    print("relative order at the end of the tag.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def default_file_list():
    helper = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          'get-tonos-mei.sh')
    if not os.path.exists(helper):
        sys.exit(f"Cannot find {helper}; pass the MEI files as arguments.")
    result = subprocess.run(['bash', helper], capture_output=True, text=True)
    if result.returncode != 0:
        sys.exit(f"{helper} failed:\n{result.stderr}")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser(
        description="Check, and optionally normalise, the attribute order in "
                    "the project MEI files.")
    parser.add_argument('files', nargs='*',
                        help="MEI files to process (default: those listed by "
                             "get-tonos-mei.sh)")
    parser.add_argument('--update', action='store_true',
                        help="rewrite the files so they follow the preferred "
                             "order")
    parser.add_argument('--by-file', action='store_true',
                        help="add a per-file compliance breakdown")
    parser.add_argument('--show', type=int, default=0, metavar='N',
                        help="show up to N example divergences per file")
    parser.add_argument('--min-instances', type=int, default=1, metavar='N',
                        help="only list elements occurring at least N times "
                             "(default: 1)")
    parser.add_argument('--spec', action='store_true',
                        help="print the preferred order and exit")
    parser.add_argument('--no-verify', action='store_true',
                        help="skip the canonical-XML check that --update "
                             "changed nothing but attribute order")
    parser.add_argument('--check', action='store_true',
                        help="exit with status 1 if any tag diverges "
                             "(for git hooks and CI)")
    parser.add_argument('--quiet', '-q', action='store_true',
                        help="suppress the report; only warnings and errors "
                             "are printed")
    args = parser.parse_args()

    check_spec()

    if args.spec:
        print_spec()
        return 0

    files = args.files or default_file_list()
    if not files:
        sys.exit("No MEI files to process.")

    total = Stats()
    per_file = []
    updated = []
    failed = []

    for path in files:
        if not os.path.exists(path):
            print(f"Warning: {path} does not exist, skipped", file=sys.stderr)
            continue
        try:
            stats, new_text, examples = process_file(path, args.show)
        except (MalformedTag, ValueError, UnicodeDecodeError) as e:
            print(f"Warning: could not process {path}: {e}", file=sys.stderr)
            failed.append(path)
            continue

        total.merge(stats)
        per_file.append((path, stats))

        if examples and not args.quiet:
            print(f"\n{path}")
            for elem, line, before, after in examples:
                print(f"  line {line} <{elem}>")
                print(f"    -  {before}")
                print(f"    +  {after}")

        if args.update and new_text is not None:
            if not args.no_verify and not same_document(read_text(path),
                                                        new_text):
                print(f"Error: rewriting {path} would change the document; "
                      f"file left untouched", file=sys.stderr)
                failed.append(path)
                continue
            write_text(path, new_text)
            updated.append((path, stats.total_divergent))

    orderable = total.total_orderable
    divergent = total.total_divergent

    if not args.quiet:
        print()
        print("=" * 74)
        print("MEI ATTRIBUTE ORDER" + (" -- UPDATED" if args.update else ""))
        print("=" * 74)
        print(f"Files analysed: {len(per_file)}")
        print()
        print_element_table(total, args.min_instances)

        print()
        print(f"Compliance : {orderable - divergent} / {orderable} tags "
              f"({pct(orderable - divergent, orderable):.1f}%)")
        print(f"Divergence : {divergent} / {orderable} tags "
              f"({pct(divergent, orderable):.1f}%)")
        print("(tags with fewer than two attributes cannot diverge and are "
              "excluded)")

        if total.unknown:
            print()
            print("Attributes not covered by the spec (left in their original "
                  "relative order):")
            for (elem, attr), count in total.unknown.most_common():
                print(f"  {elem}@{attr:<20} {count}")

        if args.by_file:
            print()
            print("PER FILE")
            print('-' * 74)
            rows = sorted(per_file, key=lambda r: r[1].total_divergent,
                          reverse=True)
            for path, stats in rows:
                o, d = stats.total_orderable, stats.total_divergent
                print(f"  {os.path.basename(path):<48}"
                      f"{o - d:>7}/{o:<7}{pct(o - d, o):>7.1f}%")

        if args.update:
            print()
            if updated:
                print(f"Updated {len(updated)} file(s), "
                      f"{sum(n for _, n in updated)} tag(s) reordered.")
            else:
                print("Nothing to update: every file already complies.")
        elif divergent:
            print()
            print("Run with --update to apply the preferred order.")

    if failed:
        print(f"{len(failed)} file(s) could not be processed.",
              file=sys.stderr)
        return 2
    # --update leaves the files compliant, so only a plain check can fail.
    if args.check and not args.update and divergent:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
