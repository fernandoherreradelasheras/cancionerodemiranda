"""Print the editorial apparatus of every tono, as the PDFs will print it.

A proof-reading tool: it calls the very functions the pipeline uses --
mei_annotations.collect() for the notes, expand_annots.anchor_note() /
marker_text() for the scholar footnotes -- so what shows up here is what ends up
in the editions, without building 154 PDFs to find out.

Every annotation is listed with the location it will carry, the editor's prose,
the qualifiers taken from the MEI, and whether the scholar edition can anchor a
footnote marker on it. When an annot points at an <app> whose readings belong
to a variant group (`@class="#vgrp-..."`, declared as a <category>), the other
<app>s of the group are listed too, even if the `@plist` does not name them:
the group is one editorial decision and has to be proof-read as a whole. This
is a listing aid only -- the PDFs print the annot's text, location and
qualifiers, never the readings, so it changes nothing in them. Encoding problems (a dangling `@plist`, an annot with no
locatable target, a note that no marker can reach) are reported as AVISO lines
and counted in the summary.

    python pdf-generation/scripts/list_annotations.py            # every tono
    python pdf-generation/scripts/list_annotations.py 46 52      # some tonos
    python pdf-generation/scripts/list_annotations.py --problems # only warnings
    python pdf-generation/scripts/list_annotations.py --json     # machine form
"""

import argparse
import json
import sys
from pathlib import Path

from lxml import etree as ET

import mei_annotations as ann
import expand_annots

REPO_ROOT = Path(__file__).resolve().parents[2]


def tono_files(numbers):
    """[(number, title, mei path)] from tonos/tonos.json, the same list
    generate-pdfs.py builds from."""
    with open(REPO_ROOT / "tonos" / "tonos.json") as f:
        scores = json.load(f)['scores']
    out = []
    for i, score in enumerate(scores, start=1):
        mei = score.get('meiFile')
        if not mei or mei in ("", "null"):
            continue
        if numbers and i not in numbers:
            continue
        out.append((i, score.get('title', ''),
                    REPO_ROOT / "tonos" / score['path'] / mei))
    return out


def anchors_of(annotation):
    """The note ids the scholar edition would hang the footnote marker on."""
    ids = []
    for target in annotation.anchors:
        note = expand_annots.anchor_note(target)
        if note is not None and note.get(ann.XML_ID) and note.get(ann.XML_ID) not in ids:
            ids.append(note.get(ann.XML_ID))
    return ids


def variant_groups(root):
    """{class id: (label, [app, ...])} for the variant groups the <app>s of a
    tono classify under, apps in document order. The label is the <category>
    <label> when there is one, else the class id itself."""
    labels = {}
    for category in root.xpath('//mei:classDecls//mei:category', namespaces=ann.NSMAP):
        label = category.find("mei:label", ann.NSMAP)
        if category.get(ann.XML_ID) and label is not None:
            labels[category.get(ann.XML_ID)] = " ".join("".join(label.itertext()).split())
    groups = {}
    for app in root.xpath('//mei:app', namespaces=ann.NSMAP):
        if ann.is_clefs_apparatus(app):
            continue
        for cid in ann._classes_of(app):
            groups.setdefault(cid, (labels.get(cid, cid), []))[1].append(app)
    return groups


def group_extras(annotation, groups, source_names):
    """[(class id, label, n apps, [Reading])] for the <app>s that share a variant group
    with the ones the annot points at but that its @plist leaves out."""
    pointed = {ann._editorial_of(t) for t in annotation.anchors}
    out = []
    for cid in dict.fromkeys(annotation.categories):
        label, apps = groups.get(cid, (cid, []))
        readings, count = [], 0
        for app in apps:
            if app in pointed:
                continue
            count += 1
            measure, _ = ann._locate(app)
            for reading in ann.readings_of(app, source_names):
                reading.where = measure or ""
                readings.append(reading)
        if readings:
            out.append((cid, label, count, readings))
    return out


def reading_line(reading, with_where):
    mark = "impresa" if reading.printed else "alternativa"
    sources = f' — {", ".join(reading.sources)}' if reading.sources else ''
    where = f'c.{reading.where} ' if with_where and reading.where else ''
    return f'        · {where}{reading.label} ({mark}): {reading.text}{sources}'


def report(number, title, mei_path, problems_only=False):
    """Print one tono's apparatus; return (n annotations, n warnings)."""
    warnings = []
    root = ET.parse(str(mei_path)).getroot()
    annotations = ann.collect(root, warn=warnings.append)
    groups = variant_groups(root)
    source_names = ann._source_names(root)
    shown_groups = {}          # class id -> number of the note that listed it

    lines = []
    for i, annotation in enumerate(annotations, start=1):
        anchors = anchors_of(annotation)
        note_warnings = []
        if annotation.unresolved:
            note_warnings.append("@plist sin resolver: "
                                 + ", ".join(annotation.unresolved))
        # A note about a whole part ("Voz reconstruida") has nowhere to put a
        # marker and does not want one; only a note aimed at a bar is missing
        # something when it cannot be anchored.
        if not anchors and annotation.measures:
            note_warnings.append("sin llamada en la partitura (edición musicológica)")
        if not annotation.text:
            note_warnings.append("sin texto: la nota queda sólo con los calificativos")
        if problems_only and not note_warnings:
            continue

        qualifiers = annotation.qualifiers()
        tail = f'  [{"; ".join(qualifiers)}]' if qualifiers else ''
        lines.append(f'  {i:>3}. {annotation.location or "(sin localización)"}: '
                     f'{annotation.text or "(sin texto)"}{tail}')
        extras = group_extras(annotation, groups, source_names)
        with_where = len(annotation.measures) > 1 or bool(extras)
        for reading in annotation.readings:
            lines.append(reading_line(reading, with_where))
        # The rest of the variant group: in full the first time the group
        # comes up, by reference afterwards, so a group spread over several
        # annots is not printed once per annot.
        for cid, label, apps, readings in extras:
            more = f'{apps} variante{"s" if apps > 1 else ""} más'
            if cid in shown_groups:
                lines.append(f'        + grupo «{label}» (#{cid}): {more}, '
                             f'véase la nota {shown_groups[cid]}')
                continue
            shown_groups[cid] = i
            lines.append(f'        + grupo «{label}» (#{cid}): {more}, fuera del @plist')
            for reading in readings:
                lines.append(reading_line(reading, True))
        for problem in note_warnings:
            lines.append(f'        ! {problem}')

    if lines or warnings or not problems_only:
        print(f'\n=== Tono {number}: {title} — {len(annotations)} anotación(es)'
              f'{"" if not warnings else f", {len(warnings)} aviso(s)"}')
        print(f'    {mei_path.relative_to(REPO_ROOT)}')
        for line in lines:
            print(line)
        for warning in warnings:
            print(f'  AVISO: {warning}')
    return len(annotations), len(warnings)


def reading_json(reading, with_where=False):
    out = {"label": reading.label, "text": reading.text,
           "printed": reading.printed, "sources": reading.sources}
    if with_where:
        out["measure"] = reading.where
    return out


def annotation_json(annotation, groups, source_names):
    out = {
        "location": annotation.location,
        "measures": annotation.measures,
        "parts": annotation.parts,
        "type": annotation.kind,
        "text": annotation.text,
        "qualifiers": annotation.qualifiers(),
        "anchors": anchors_of(annotation),
        "unresolved": annotation.unresolved,
        "readings": [reading_json(r) for r in annotation.readings],
    }
    extras = group_extras(annotation, groups, source_names)
    if extras:
        out["group_readings"] = [{
            "class": cid, "label": label,
            "readings": [reading_json(r, with_where=True) for r in readings],
        } for cid, label, _, readings in extras]
    return out


def as_json(number, title, mei_path):
    root = ET.parse(str(mei_path)).getroot()
    annotations = ann.collect(root)
    groups = variant_groups(root)
    source_names = ann._source_names(root)
    return {
        "tono": number,
        "title": title,
        "mei": str(mei_path.relative_to(REPO_ROOT)),
        "annotations": [annotation_json(a, groups, source_names)
                        for a in annotations],
    }


def main():
    parser = argparse.ArgumentParser(
        description="Lista las notas a la edición musical de cada tono, tal y "
                    "como las imprimirán los PDFs.")
    parser.add_argument("tono", nargs="*", type=int,
                        help="Números de tono (1-based). Si se omiten, todos.")
    parser.add_argument("--problems", action="store_true",
                        help="Mostrar sólo las anotaciones con algún problema.")
    parser.add_argument("--json", action="store_true",
                        help="Volcar los datos en JSON en vez de texto.")
    args = parser.parse_args()

    tonos = tono_files(set(args.tono))
    if not tonos:
        print("No hay tonos que listar.", file=sys.stderr)
        sys.exit(2)

    if args.json:
        print(json.dumps([as_json(*t) for t in tonos], ensure_ascii=False, indent=2))
        return

    total, problems = 0, 0
    for number, title, mei_path in tonos:
        count, warnings = report(number, title, mei_path, args.problems)
        total += count
        problems += warnings

    print("\n" + "=" * 64)
    print(f"{total} anotación(es) en {len(tonos)} tono(s); {problems} aviso(s) de codificación.")
    print("=" * 64)


if __name__ == "__main__":
    main()
