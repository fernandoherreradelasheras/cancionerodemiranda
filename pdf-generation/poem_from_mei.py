"""Read the poetic text embedded in a tono's MEI (<back><div type="poem">).

The poem lives inside the MEI as <lg>/<l> under <back><div type="poem">,
decoupled from the score — Verovio ignores <back>, so the engraving is
untouched. `parse()` returns a rich Poem object (blocks of stanzas + text
notes); the pipeline consumes those properties directly (no text/marker
re-parsing). Section association:

  - block <lg> with @corresp -> its stanzas are overlaid onto that score section.
  - block <lg> with @decls   -> printed only, but its heading titles that section.
  - inner <lg> with @corresp -> per-stanza overlay routing (the old '@custom').

`<annot type="text-note">` elements are the text notes (see extract_notes).
"""

from dataclasses import dataclass, field

from pathlib import Path

from lxml import etree as ET

MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {'mei': MEI_NS}
XML_ID = '{http://www.w3.org/XML/1998/namespace}id'


@dataclass
class Stanza:
    lines: list                     # verse lines (strings)
    section: str = None             # score section it is overlaid onto (None = not overlaid)
    number: int = None              # the copla's authored @n (its number within the poem)


@dataclass
class Block:
    heading: str                    # display heading ("Coplas", "Estribillo", "Copla 1ª")
    stanzas: list                   # list[Stanza]
    titles: list = field(default_factory=list)   # (section_label, title_text) to stamp on the score
    custom: bool = False            # per-stanza overlay routing (the old '@custom')


@dataclass
class Poem:
    blocks: list                    # list[Block]
    notes: list                     # list[(display, text)] from extract_notes


def _root(mei):
    if isinstance(mei, (str, Path)):
        return ET.parse(str(mei)).getroot()
    return mei


def _poem_div(root):
    hits = root.xpath('//mei:back//mei:div[@type="poem"]', namespaces=NSMAP)
    return hits[0] if hits else None


def has_embedded_poem(mei):
    return _poem_div(_root(mei)) is not None


def _resolve_label(root, corresp):
    """#xml:id -> the @label of the score <section> it points to. When the id
    resolves to no element (the target section is absent from the score, e.g.
    tono 76's 'coplas'), fall back to the bare id — the converter always uses
    the section label as the id, so the label is recoverable and the block keeps
    its overlay semantics (attempted, then skipped for the missing section)."""
    xmlid = corresp.lstrip('#')
    els = root.xpath('//*[@xml:id=$i]', i=xmlid, namespaces=NSMAP)
    return els[0].get('label') if els else xmlid


def _lines_of(g):
    return [(l.text or '') for l in g.findall('mei:l', NSMAP)]


def _stanza(g, section):
    n = g.get('n')
    return Stanza(_lines_of(g), section, int(n) if n and n.isdigit() else None)


def _heading(lg, typ):
    label = lg.find('mei:label', NSMAP)
    if label is not None and label.text:
        return label.text
    return typ.capitalize() if typ else 'Texto'


def parse(mei):
    """The poem as a Poem (blocks + notes), or None if the MEI has no poem."""
    root = _root(mei)
    div = _poem_div(root)
    if div is None:
        return None
    blocks = []
    for lg in div.findall('mei:lg', NSMAP):
        heading = _heading(lg, lg.get('type') or '')
        inner = lg.findall('mei:lg', NSMAP)
        if any(g.get('corresp') for g in inner):        # per-stanza routing (@custom)
            stanzas, order = [], []
            for g in inner:
                section = _resolve_label(root, g.get('corresp'))
                stanzas.append(_stanza(g, section))
                if section not in order:
                    order.append(section)
            titles = [(section, section) for section in order]
            blocks.append(Block(heading, stanzas, titles, custom=True))
        else:
            groups = inner if inner else [lg]
            corresp, decls = lg.get('corresp'), lg.get('decls')
            section = _resolve_label(root, corresp or decls) if (corresp or decls) else None
            overlay = section if corresp else None
            stanzas = [_stanza(g, overlay) for g in groups]
            titles = [(section, heading)] if section else []
            blocks.append(Block(heading, stanzas, titles))
    return Poem(blocks, extract_notes(root))


def overlay_groups(poem):
    """Ordered [(section, [Stanza, ...])] for the sections that get overlaid
    text on the score (first-appearance order)."""
    groups, order = {}, []
    for block in poem.blocks:
        for stanza in block.stanzas:
            if stanza.section:
                if stanza.section not in groups:
                    groups[stanza.section] = []
                    order.append(stanza.section)
                groups[stanza.section].append(stanza)
    return [(section, groups[section]) for section in order]


def _line_numbers(div):
    """xml:id of every <l> -> its 1-based position in the poem (the verse
    number a text note refers to)."""
    return {l.get(XML_ID): i + 1
            for i, l in enumerate(div.xpath('.//mei:l', namespaces=NSMAP))}


def extract_notes(mei):
    """Text notes as (display, text), ordered by verse (source-wide notes last).
    Each <annot> carries @corresp -> the #xml:id of the <l> it annotates; the
    display number is that <l>'s 1-based position, or an explicit @n (ranges).
    A note with no @corresp is a source-wide note (display None)."""
    root = _root(mei)
    div = _poem_div(root)
    if div is None:
        return []
    nums = _line_numbers(div)
    notes = []
    for a in div.findall('mei:annot', NSMAP):
        pos = nums.get((a.get('corresp') or '').lstrip('#'))  # None = source-wide
        display = a.get('n') or (str(pos) if pos is not None else None)
        text = ' '.join(''.join(a.itertext()).split())
        notes.append((pos, display, text))
    notes.sort(key=lambda t: (t[0] is None, t[0] or 0))
    return [(display, text) for _, display, text in notes]
