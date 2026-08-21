"""Single reading of the MEI critical apparatus, shared by the whole pipeline.

The editorial commentary of a tono lives in `<annot @plist>`: the prose is the
annot's own text and `@plist` points at the element(s) it talks about — usually
an editorial container (`<corr>`, `<reg>`, `<supplied>`, `<unclear>`, `<sic>`,
`<choice>`, `<app>`), sometimes a plain `<note>`/`<measure>` when the editor is
just commenting on the source without emending it.

Two consumers used to read that markup independently and disagreed about it:

  * extract_comments_from_mei.py (the "Notas a la edición musical" list of the
    performer edition) stopped at the *first* editorial target of an annot, so a
    note covering three voices was filed under one;
  * expand_annots.py (the numbered footnotes of the scholar edition) emitted one
    footnote *per* target, so the same text was printed up to four times.

Both now call `collect()` here, so a tono's apparatus is one list of
`Annotation` records, in musical order, whatever consumes it.

What a record carries:

  * `text`   -- the editor's prose, verbatim (whitespace collapsed). It is the
                note; nothing here ever replaces it.
  * `kind`   -- the editorial category (corr, reg, supplied, ...) or "comment"
                when the target is not an editorial element.
  * `measures` / `parts` -- *every* place the annot applies to, taken from the
                targets and falling back to the annot's own position in the tree
                when a `@plist` reference is dangling (bad encoding must not
                make the note disappear; `unresolved` records it instead).
  * `meta`   -- @reason/@cert/@evidence/@source of the editorial elements, which
                the MEI has always carried and the PDFs never printed. @resp is
                deliberately ignored: responsibility is stated once for the whole
                edition, not note by note.
  * `readings` -- for `<app>`/`<choice>`, the structured alternatives (which one
                is printed and what the others say). The PDFs do not render this
                -- the prose already explains the variant, and the mechanical
                rendering was both redundant and, for `<app>`, wrong -- but the
                score viewer needs it to offer the alternatives, and
                list_annotations.py prints it to check the encoding.

`describe()` renders any MEI element as Spanish prose ("mínima do♯5") and never
returns None, so a gap in its vocabulary degrades to "<elemento>" instead of
poisoning a note with the string "None".
"""

from dataclasses import dataclass, field
import unicodedata

from lxml import etree as ET

MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {"mei": MEI_NS}
XML_ID = '{http://www.w3.org/XML/1998/namespace}id'

# Editorial elements an <annot> may point at, i.e. the ones that classify a note.
EDITORIAL_ELEMENTS = ("choice", "app", "subst", "corr", "sic", "reg", "orig",
                      "unclear", "supplied", "add", "del", "gap", "damage",
                      "restore", "abbr", "expan")

# How each one is named in the printed note.
TYPE_LABELS = {
    "corr": "corrección", "sic": "sic", "reg": "regularización",
    "orig": "lectura original", "unclear": "lectura insegura",
    "supplied": "pasaje suplido", "choice": "lectura alternativa",
    "app": "variante", "subst": "sustitución", "add": "añadido",
    "del": "pasaje suprimido", "gap": "laguna", "damage": "deterioro",
    "restore": "restitución", "abbr": "abreviatura", "expan": "expansión",
    "comment": "",
}

# Labels for the editorial containers when their content is spelled out.
CONTAINER_LABELS = {
    "orig": "original", "reg": "regularización", "corr": "corrección",
    "sic": "sic", "unclear": "lectura insegura", "supplied": "suplido",
    "abbr": "abreviatura", "expan": "expansión", "add": "añadido",
    "del": "suprimido", "damage": "deteriorado", "restore": "restituido",
}

# @reason / @cert / @evidence carry either a MEI-ish code or free prose; the
# codes are translated, anything else is passed through as written.
REASON_LABELS = {
    "ink": "mancha de tinta", "lost": "texto perdido",
    "illegible": "ilegible", "damage": "deterioro del papel",
    "paper trimmed": "papel recortado", "trimmed": "papel recortado",
    "faded": "tinta desvaída", "omitted": "omitido en la fuente",
}
CERT_LABELS = {"high": "certeza alta", "medium": "certeza media",
               "low": "certeza baja", "unknown": "certeza indeterminada"}
EVIDENCE_LABELS = {"internal": "por evidencia interna",
                   "external": "por evidencia externa",
                   "conjecture": "por conjetura"}

PITCH_NAMES = {"c": "do", "d": "re", "e": "mi", "f": "fa",
               "g": "sol", "a": "la", "b": "si"}
ACCID_SYMBOL = {"s": "♯", "f": "♭", "n": "♮", "ss": "♯♯", "x": "♯♯",
                "ff": "♭♭", "sf": "♯♭", "fs": "♭♯", "nf": "♮♭", "ns": "♮♯"}
# Mensural names, the vocabulary the edition's prose uses.
DURATIONS = {"maxima": "máxima", "longa": "longa", "long": "longa",
             "breve": "breve", "1": "semibreve", "2": "mínima",
             "4": "semimínima", "8": "corchea", "16": "semicorchea",
             "32": "fusa", "64": "semifusa", "128": "garrapatea"}
CLEF_NAMES = {"C": "Do", "G": "Sol", "F": "Fa"}


def local(el):
    """Local (namespace-less) name of an element, '' for comments and PIs."""
    return ET.QName(el).localname if isinstance(el.tag, str) else ""


def _norm(text):
    """Lowercase, accent-free form, for 'does the prose already say this?'."""
    stripped = unicodedata.normalize("NFKD", (text or "").lower())
    return "".join(c for c in stripped if not unicodedata.combining(c))


# --------------------------------------------------------------------------
# Describing musical content
# --------------------------------------------------------------------------

def _accid_of(note):
    """(symbol, is_editorial) of a note's accidental. It sits either on @accid
    (a written accidental) or on a child <accid>, whose @func="edit" marks the
    editorial ficta the edition adds in parentheses. @accid.ges (a sounding-only
    accidental, e.g. one carried over from earlier in the bar) is reported too,
    since a reader comparing readings needs to know the note sounds altered."""
    if note.get("accid"):
        return ACCID_SYMBOL.get(note.get("accid"), ""), False
    child = note.find("mei:accid", NSMAP)
    if child is not None and (child.get("accid") or child.get("accid.ges")):
        symbol = ACCID_SYMBOL.get(child.get("accid") or child.get("accid.ges"), "")
        return symbol, child.get("func") == "edit"
    if note.get("accid.ges"):
        return ACCID_SYMBOL.get(note.get("accid.ges"), ""), False
    return "", False


def _duration(el):
    """'mínima con puntillo', or '' when the element carries no duration."""
    dur = DURATIONS.get(el.get("dur"), el.get("dur"))
    if not dur:
        return ""
    dots = int(el.get("dots") or 0)
    return dur + (" con puntillo" * dots if dots else "")


def _pitch(note):
    symbol, editorial = _accid_of(note)
    name = PITCH_NAMES.get(note.get("pname", ""), note.get("pname", "?"))
    return (f'{name}{symbol}{note.get("oct", "")}'
            + (" (alteración editorial)" if editorial else ""))


def _children_text(el, sep=" "):
    return sep.join(t for t in (describe(child) for child in el) if t)


def _note(el):
    dur = _duration(el)
    return f'{dur} {_pitch(el)}'.strip()


def _rest(el):
    dur = _duration(el)
    return f'silencio de {dur}' if dur else 'silencio'


def _chord(el):
    pitches = ", ".join(_pitch(n) for n in el.findall("mei:note", NSMAP))
    return f'acorde {_duration(el)} ({pitches})'.replace("  ", " ").strip()


def _syl(el):
    return (el.text or "").strip()


def _verse(el):
    syls = " ".join(s for s in (_syl(s) for s in el.findall("mei:syl", NSMAP)) if s)
    n = el.get("n")
    return f'estrofa {n}: «{syls}»' if n else f'«{syls}»'


def _clef(el):
    shape = CLEF_NAMES.get(el.get("shape"), el.get("shape") or "?")
    return f'clave de {shape} en {el.get("line", "?")}ª'


def _container(el):
    """An editorial container: its label plus whatever it wraps."""
    label = CONTAINER_LABELS.get(local(el), local(el))
    body = _children_text(el)
    return f'{label}: {body}' if body else label


def _passthrough(el):
    """Elements that only group other events (beam, tuplet, layer, staff...)."""
    return _children_text(el)


DESCRIBERS = {
    "note": _note,
    "chord": _chord,
    "rest": _rest,
    "space": lambda el: f'espacio de {_duration(el)}'.strip(),
    "mRest": lambda el: "silencio de compás completo",
    "mSpace": lambda el: "compás vacío",
    "multiRest": lambda el: f'{el.get("num", "?")} compases de silencio',
    "syl": _syl,
    "verse": _verse,
    "clef": _clef,
    "keySig": lambda el: f'armadura {el.get("sig", "?")}',
    "meterSig": lambda el: f'compás {el.get("count", "?")}/{el.get("unit", "?")}',
    "barLine": lambda el: f'barra de compás ({el.get("form", "simple")})',
    "accid": lambda el: ('alteración '
                         + ACCID_SYMBOL.get(el.get("accid") or el.get("accid.ges"), "?")
                         + (" (editorial)" if el.get("func") == "edit" else "")),
    "artic": lambda el: f'articulación {el.get("artic", "")}'.strip(),
    "dot": lambda el: "puntillo",
    "tie": lambda el: "ligadura de unión",
    "slur": lambda el: "ligadura de expresión",
    "fermata": lambda el: "calderón",
    "dir": lambda el: f'indicación «{"".join(el.itertext()).strip()}»',
    "dynam": lambda el: f'dinámica «{"".join(el.itertext()).strip()}»',
    "harm": lambda el: f'cifrado «{"".join(el.itertext()).strip()}»',
    "annot": lambda el: "",          # a note *about* the music, not music
    "bracketSpan": lambda el: "corchete editorial",
    "repeatMark": lambda el: "signo de repetición",
    "symbol": lambda el: "signo",
    "beam": _passthrough, "tuplet": _passthrough, "layer": _passthrough,
    "staff": _passthrough, "measure": _passthrough, "section": _passthrough,
    "lem": _passthrough, "rdg": _passthrough, "scoreDef": lambda el: "cambio de disposición",
    "staffDef": lambda el: f'pauta {el.get("n", "?")}',
    "l": lambda el: f'«{" ".join("".join(el.itertext()).split())}»',
}
DESCRIBERS.update({name: _container for name in CONTAINER_LABELS})


def _alternatives(el):
    """An <app>/<choice> nested inside something being described: what the score
    prints, noting that there is more than one reading. The alternatives
    themselves are reported separately (Annotation.readings), not inlined here."""
    branches = readings_of(el)
    printed = next((r for r in branches if r.printed), None)
    body = printed.text if printed else _children_text(el)
    return f'{body} ({TYPE_LABELS.get(local(el), local(el))})' if branches else body


DESCRIBERS.update({name: _alternatives for name in ("app", "choice", "subst")})


def describe(el):
    """Spanish description of an MEI element and its content.

    Never returns None: an element with no describer degrades to its own tag
    name, so a vocabulary gap shows up as `<ornam>` in the output instead of
    silently becoming the literal string "None" inside a note.
    """
    name = local(el)
    if not name:
        return ""
    describer = DESCRIBERS.get(name)
    if describer is None:
        body = _children_text(el)
        return f'<{name}>' + (f': {body}' if body else "")
    return describer(el)


# --------------------------------------------------------------------------
# Readings of <app> / <choice>
# --------------------------------------------------------------------------

@dataclass
class Reading:
    """One alternative inside an <app> or a <choice>."""
    label: str          # "lectura adoptada", "corrección", "sic"...
    text: str           # its content, described
    printed: bool       # is this the one Verovio engraves?
    sources: list = field(default_factory=list)
    where: str = ""     # measure it sits in (one annot may cover several)


def _source_names(root):
    """{xml:id: readable name} from <sourceDesc>, so @source can be resolved to
    a siglum instead of printing a raw '#P-Ln_MM4802-1'."""
    names = {}
    for source in root.xpath('//mei:sourceDesc/mei:source', namespaces=NSMAP):
        sid = source.get(XML_ID)
        if not sid:
            continue
        rism = source.xpath('.//mei:repository/mei:identifier[@auth="RISM"]/text()',
                            namespaces=NSMAP)
        title = source.xpath('./mei:bibl/mei:title/text()', namespaces=NSMAP)
        label = sid
        if rism and title:
            label = f'{rism[0].strip()} ({" ".join(title[0].split())})'
        elif title:
            label = " ".join(title[0].split())
        names[sid] = label
    return names


def _categories(root):
    """{xml:id: desc} for the variant groups declared in <classDecls>.

    A `<category>` is the editorial decision a set of `<app>` belongs to. Its
    `<desc>` is the part of the note that is true of the whole group, so it is
    written once there instead of being repeated in every annot -- see
    `collect()`, which puts it back at the head of the first note of the group.
    """
    out = {}
    for category in root.xpath('//mei:classDecls//mei:category', namespaces=NSMAP):
        cid = category.get(XML_ID)
        desc = category.find("mei:desc", NSMAP)
        if cid and desc is not None:
            text = " ".join(("".join(desc.itertext())).split())
            if text:
                out[cid] = text
    return out


def _classes_of(el):
    """The variant groups the readings of an <app> classify under."""
    out = []
    for branch in el:
        for ref in (branch.get("class") or "").split():
            cid = ref.lstrip('#')
            if cid not in out:
                out.append(cid)
    return out


def _sources_of(el, source_names):
    return [source_names.get(ref.lstrip('#'), ref.lstrip('#'))
            for ref in (el.get("source") or "").split() if ref]


def readings_of(el, source_names=None):
    """The alternatives an <app> or <choice> offers, in the order Verovio sees
    them. Verovio engraves the <lem> of an <app> (falling back to the first
    <rdg>) and the *first* child of a <choice> -- verified against the renderer,
    not assumed -- so `printed` says which one the score actually shows.

    Note this iterates the readings themselves; the previous code iterated the
    children *of* the first reading, so a single variant holding two notes was
    reported as two separate readings.
    """
    source_names = source_names or {}
    name = local(el)
    out = []
    if name == "app":
        branches = [c for c in el if local(c) in ("lem", "rdg")]
        lem = next((c for c in branches if local(c) == "lem"), None)
        printed = lem if lem is not None else (branches[0] if branches else None)
        for branch in branches:
            body = _children_text(branch)
            out.append(Reading(
                label="lectura adoptada" if local(branch) == "lem" else "otra lectura",
                text=body or "(omitido)",
                printed=branch is printed,
                sources=_sources_of(branch, source_names)))
    elif name in ("choice", "subst"):
        for i, branch in enumerate(el):
            out.append(Reading(
                label=CONTAINER_LABELS.get(local(branch), local(branch)),
                text=_children_text(branch) or "(omitido)",
                printed=i == 0,
                sources=_sources_of(branch, source_names)))
    return out


# --------------------------------------------------------------------------
# Collecting the apparatus
# --------------------------------------------------------------------------

@dataclass
class Annotation:
    text: str
    kind: str
    measures: list
    parts: list
    meta: list                       # ready-made Spanish qualifiers
    readings: list                   # list[Reading], only for app/choice
    anchors: list                    # target elements, in document order
    unresolved: list                 # @plist ids that match no element
    order: int                       # document position, for sorting
    categories: list = field(default_factory=list)   # variant groups of its apps

    @property
    def location(self):
        """'Compás 47, Tenor' / 'Compases 75-76, Alto' / 'Alto' / ''."""
        parts = _join(self.parts)
        if not self.measures:
            return parts
        if len(self.measures) == 1:
            measures = f'Compás {self.measures[0]}'
        elif _contiguous(self.measures):
            measures = f'Compases {self.measures[0]}-{self.measures[-1]}'
        else:
            measures = 'Compases ' + ", ".join(self.measures)
        return f'{measures}, {parts}' if parts else measures

    def qualifiers(self, with_kind=True):
        """The bracketed tail of a note: its editorial category plus the
        @reason/@cert/@evidence/@source the MEI records. Anything the prose
        already says is left out, so nothing is stated twice."""
        out = []
        if with_kind and TYPE_LABELS.get(self.kind):
            out.append(TYPE_LABELS[self.kind])
        out.extend(self.meta)
        prose = _norm(self.text)
        return [q for q in dict.fromkeys(out) if _norm(q) not in prose]


def _contiguous(measures):
    try:
        numbers = [int(m) for m in measures]
    except ValueError:
        return False
    return numbers == list(range(numbers[0], numbers[0] + len(numbers)))


def _join(items):
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " y " + items[-1]


def part_names(root):
    """{staff number: label} from the first scoreDef."""
    names = {}
    for staff_def in root.xpath('(//mei:scoreDef)[1]//mei:staffDef', namespaces=NSMAP):
        n = staff_def.get("n")
        label = staff_def.find("mei:label", NSMAP)
        if n is not None and label is not None and label.text:
            names[n] = label.text.strip()
    return names


def ancestor_or_self(el, name):
    """The nearest enclosing element with that local name, or el itself."""
    while el is not None:
        if local(el) == name:
            return el
        el = el.getparent()
    return None


def containing_note(el):
    """The <note> an element hangs off, if any. Editorial containers often wrap
    something *inside* a note -- an <accid>, a <verse> -- and then the note that
    holds them is the only place a footnote marker can be anchored."""
    return ancestor_or_self(el.getparent(), "note") if el.getparent() is not None else None


# What a <dir> can hang off: any event that occupies time on a staff. Notes
# first, so a marker lands on the emended note rather than on a rest beside it.
ANCHORABLE = ("note", "rest", "mRest", "space", "mSpace", "chord")


def anchor_note(target):
    """The event a footnote marker can hang off for a `@plist` target: the
    target itself, the first anchorable event inside it, or the note that
    contains it.

    Rests count: "Silencio añadido" and "Compases añadidos" wrap nothing but
    rests, and looking for notes alone left them with no marker at all. The last
    case is what `<note><corr><accid/></corr></note>` and corrected `<verse>`s
    need; looking only downwards (as the pipeline did) left every
    accidental-only and lyric-only emendation without one either.

    scripts/ensure_note_ids.py uses this same rule to decide which events must
    carry an xml:id, so what it prepares is exactly what expand_annots.py looks
    for.
    """
    if local(target) in ANCHORABLE:
        return target
    for name in ANCHORABLE:
        inside = target.find(f'.//mei:{name}', namespaces=NSMAP)
        if inside is not None:
            return inside
    # A supplied/corrected <tie> or <slur> holds no event of its own; it names
    # the note it starts on, and that is where the marker belongs.
    for el in target.iter():
        if el.get("startid"):
            referenced = target.getroottree().getroot().xpath(
                '//*[@xml:id="%s"]' % el.get("startid").lstrip('#'), namespaces=NSMAP)
            if referenced:
                return referenced[0]
    return containing_note(target)


def _editorial_of(el):
    """The editorial container the target sits in (or is), if any. An annot
    normally points straight at the <corr>, but pointing at a note inside it is
    just as valid and used to fall through to 'no editorial type'."""
    node = el
    while node is not None:
        if local(node) in EDITORIAL_ELEMENTS:
            return node
        node = node.getparent()
    return None


def _staff_number(el):
    """The staff an element belongs to: its <staff> ancestor, its own @staff
    (control events such as <dir> hang off the measure and carry it as an
    attribute), or its @n when it is a <staffDef>."""
    staff = ancestor_or_self(el, "staff")
    if staff is not None:
        return staff.get("n")
    if el.get("staff"):
        return el.get("staff").split()[0]
    if local(el) == "staffDef":
        return el.get("n")
    return None


def _locate(el):
    """(measure number, staff number) of an element; either may be None."""
    measure = ancestor_or_self(el, "measure")
    return (measure.get("n") if measure is not None else None), _staff_number(el)


def _meta_of(elements, source_names, has_prose=True):
    """The Spanish qualifiers implied by @reason/@cert/@evidence/@source.
    @resp is skipped on purpose (see the module docstring).

    @reason is either a code ('ink', 'lost') or a whole sentence. A code always
    earns its place in the note; a sentence only does when the annot has no
    prose of its own, since otherwise it just says again, in other words, what
    the editor already wrote.
    """
    out = []
    for el in elements:
        reason = el.get("reason")
        if reason:
            code = REASON_LABELS.get(reason.strip().lower())
            if code:
                out.append(code)
            elif not has_prose:
                out.append(reason.strip())
        cert = el.get("cert")
        if cert:
            out.append(CERT_LABELS.get(cert.strip().lower(), f'certeza {cert.strip()}'))
        evidence = el.get("evidence")
        if evidence:
            out.append(EVIDENCE_LABELS.get(evidence.strip().lower(), evidence.strip()))
        for source in _sources_of(el, source_names):
            # '#TODO' and friends are encoding placeholders, not sources.
            if not source.upper().startswith("TODO"):
                out.append(f'según {source}')
    return list(dict.fromkeys(out))


def is_clefs_apparatus(el):
    """The <app type="app_clefs"> holding the original clefs. Its annot is not a
    note: the clefs are printed in the "Datos musicales" block instead."""
    return local(el) == "app" and el.get("type") == "app_clefs"


def collect(root, warn=None):
    """Every `<annot @plist>` of a score as an ordered list of Annotation.

    `warn(message)` is called for encoding problems that would otherwise pass
    unnoticed -- a dangling `@plist` reference, an annot that cannot be placed.
    The annot is still returned: bad encoding degrades the location of a note,
    it never deletes it.
    """
    warn = warn or (lambda message: None)
    id_map = {el.get(XML_ID): el for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}
    order = {el: i for i, el in enumerate(root.iter())}
    names = part_names(root)
    source_names = _source_names(root)
    category_descs = _categories(root)

    out = []
    for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
        text = " ".join((annot.text or "").split())
        targets, unresolved = [], []
        for ref in annot.get("plist").split():
            target = id_map.get(ref.lstrip('#'))
            if target is None:
                unresolved.append(ref.lstrip('#'))
            else:
                targets.append(target)

        # The clefs apparatus is reported by the "Datos musicales" block, not
        # as an editorial note; an annot that only points there is not one.
        if targets and all(is_clefs_apparatus(t) or local(t) == "clef" for t in targets):
            continue

        for ref in unresolved:
            warn(f'@plist «#{ref}» no corresponde a ningún elemento'
                 f' (anotación: «{text[:60]}»)')

        editorial = [e for e in (_editorial_of(t) for t in targets) if e is not None]
        editorial = list(dict.fromkeys(editorial))
        kind = next((local(e) for e in editorial if not is_clefs_apparatus(e)), "comment")

        # Locate from the targets; when none resolves, fall back to where the
        # annot itself sits -- it hangs off the <staff> of the bar it comments.
        located = targets or [annot]
        # @plist order is the editor's; the note must read in musical order, so
        # the measures are listed as they sound ("Compases 75-76", never "76, 75").
        located = sorted(located, key=lambda e: order.get(e, 0))
        measures, parts = [], []
        for element in located:
            measure, staff = _locate(element)
            if measure and measure not in measures:
                measures.append(measure)
            if staff and staff not in parts:
                parts.append(staff)
        if not measures and not parts:
            warn(f'anotación sin localización: «{text[:60]}»')

        parts = [names.get(n, f'pauta {n}') for n in sorted(parts, key=_as_int)]

        readings = []
        for element in editorial:
            if local(element) in ("app", "choice", "subst") and not is_clefs_apparatus(element):
                measure, _ = _locate(element)
                for reading in readings_of(element, source_names):
                    reading.where = measure or ""
                    readings.append(reading)

        out.append(Annotation(
            text=text,
            kind=kind,
            measures=measures,
            parts=parts,
            meta=_meta_of(editorial, source_names, has_prose=bool(text)),
            readings=readings,
            anchors=targets,
            unresolved=unresolved,
            order=min((order.get(t, order[annot]) for t in located), default=order[annot]),
            categories=[c for e in editorial for c in _classes_of(e)],
        ))

    # Musical order: the document position of what each note points at. Sorting
    # by @n would shuffle sections that restart their numbering, and sorting by
    # the annots themselves leaves the section-level ones ahead of everything.
    out.sort(key=lambda a: a.order)

    # What a `<category>` says is true of every <app> of the group, so it is
    # written once, at the head of the group's first note. Repeating it on each
    # one would say the same thing five times in the list of notes; dropping it
    # would lose it, since only the web viewer reads the taxonomy.
    seen = set()
    for annotation in out:
        for cid in annotation.categories:
            if cid in seen:
                continue
            seen.add(cid)
            desc = category_descs.get(cid)
            if desc:
                annotation.text = f'{desc} {annotation.text}'.strip()

    return out


def _as_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 10 ** 6
