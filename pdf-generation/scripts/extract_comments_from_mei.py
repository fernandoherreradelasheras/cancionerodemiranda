"""The "Datos musicales" + "Notas a la edición musical" blocks of a tono.

Reads the MEI and writes the LaTeX that goes above the score: the organic, the
original clefs and key signature, and -- when asked for -- the editorial notes.

The apparatus itself is read by mei_annotations.collect(), shared with
expand_annots.py so both editions describe the same thing. What this module adds
is how a note is *printed*:

  * the editor's prose is the note, always. `<app>`/`<choice>` used to have
    theirs replaced by a machine-made "Varias opciones. Opción 1: ..." listing,
    which dropped the only part a reader needs; the alternatives stay in the MEI
    (and in --json) for the score viewer to offer.
  * every measure and voice the annot covers is named, not just the first one.
  * the editorial category and the @reason/@cert/@evidence/@source the MEI
    records are appended in brackets, unless the prose already says as much.
  * notes come out in musical order.

Usage:
    extract_comments_from_mei.py <in.mei> <json params>
        (--extractAnnotations|--noExpandAnnotations) [out.tex]

Without an output file it prints the same data as JSON (the machine-readable
form, alternatives included), which is what list_annotations.py checks.
"""

import json
import sys

from lxml import etree as ET
from pylatex.utils import escape_latex

import mei_annotations as ann

MEI_NS = ann.MEI_NS
NSMAP = ann.NSMAP


def get_staffN_for_clef(clef):
    return clef.getparent().get("n")


def get_part_name_for_clef(partNames, clef):
    return partNames[get_staffN_for_clef(clef)]


def format_keysig(keysig):
    if keysig == "1f":
        return "un bemol"
    elif keysig == "1s":
        return "un sostenido"
    else:
        return "sin alteraciones"


def get_orig_clefs(root, partNames):
    """The clefs of the source, read from the <app type="app_clefs"> apparatus.
    The annot's @plist lists the staves whose clef differs from the modern one,
    in order; the rest keep theirs."""
    res = root.xpath('(//mei:mdiv//mei:section//mei:rdg[@type="app_clefs"])[1]//ancestor::mei:app/@xml:id', namespaces=NSMAP)
    if res is None or len(res) <= 0:
        return
    appId = res[0]

    res = root.xpath('//mei:annot[starts-with(@plist, "#%s")]' % appId, namespaces=NSMAP)
    if res is None or len(res) <= 0:
        return
    annot = res[0]

    rdg_clefs = root.xpath('(//mei:mdiv//mei:section//mei:rdg[@type="app_clefs"])[1]//mei:clef', namespaces=NSMAP)
    if rdg_clefs is None or len(rdg_clefs) <= 0:
        return

    orig_clefs = []
    if "plist" in annot.keys():
        for ref in annot.get("plist").split(" ")[1:]:
            clef = next((c for c in rdg_clefs if c.get("corresp") == ref), None)
            if clef is not None:
                orig_clefs.append(clef)

    res = []
    all_clefs = orig_clefs + [clef for clef in rdg_clefs if clef not in orig_clefs]

    all_clefs.sort(key=lambda c: int(get_staffN_for_clef(c)))

    for clef in all_clefs:
        res.append(f'{get_part_name_for_clef(partNames, clef)}: '
                   f'{ann.CLEF_NAMES.get(clef.get("shape"), clef.get("shape"))} '
                   f'en {clef.get("line")}ª')

    return ", ".join(res)


def note_tex(annotation):
    """One editorial note as a LaTeX line: bold location, the editor's prose,
    and the bracketed qualifiers (category, reason, certainty, source)."""
    location = annotation.location or "Nota general"
    body = escape_latex(annotation.text)
    qualifiers = annotation.qualifiers()
    if qualifiers:
        tail = escape_latex("; ".join(qualifiers))
        body = f'{body} \\emph{{[{tail}]}}' if body else f'\\emph{{[{tail}]}}'
    return f'\\textbf{{{escape_latex(location)}}}: {body}\\\\\n'


def music_data_tex(json_info, orig_clefs):
    return ("\\subsection*{Datos musicales}\n\n"
            "\\noindent \\textbf{Orgánico}: %s\\\\\n"
            % json_info['organic']
            + "\\textbf{%s}: %s.\\\\\n"
            % ("Claves altas" if json_info['high_clefs'] else "Claves bajas", orig_clefs)
            + "\\textbf{Armadura}: %s\\\\\n"
            % format_keysig(json_info['original_armor'])
            + "\\textbf{Transcripción}: a claves modernas %s%s\n\n"
            % ("transpuestas una cuarta hacia abajo" if json_info['transposition'] == "-P4" else "sin transposición",
               ", armadura resultante: " + format_keysig(json_info['encoded_armor']) if json_info['transposition'] else ""))


def annotations_json(annotations):
    """The machine-readable form: everything a viewer needs to place a note and
    to offer the alternatives of an <app>/<choice>."""
    return [{
        "measures": a.measures,
        "parts": a.parts,
        "type": a.kind,
        "annotText": a.text,
        "qualifiers": a.qualifiers(),
        "targets": [t.get(ann.XML_ID) for t in a.anchors],
        "unresolved": a.unresolved,
        "readings": [{"label": r.label, "text": r.text,
                      "printed": r.printed, "sources": r.sources}
                     for r in a.readings],
    } for a in annotations]


def main(argv):
    input_file = argv[1]
    json_info = json.loads(argv[2])
    extract_annotations = argv[3] == "--extractAnnotations"
    output_file = argv[4] if len(argv) == 5 else None

    root = ET.parse(input_file).getroot()
    ET.register_namespace("mei", MEI_NS)

    partNames = ann.part_names(root)
    orig_clefs = get_orig_clefs(root, partNames)

    def warn(message):
        print(f'AVISO [{input_file}]: {message}', file=sys.stderr)

    annotations = ann.collect(root, warn=warn) if extract_annotations else None

    if not output_file:
        print(json.dumps({"original_clefs": orig_clefs,
                          "annotations": annotations_json(annotations or [])},
                         ensure_ascii=False))
        return

    with open(output_file, 'w') as f:
        f.write(music_data_tex(json_info, orig_clefs))
        if annotations:
            print(f"Editorial notes: {len(annotations)}")
            f.write("\\subsection*{Notas a la edición musical}\n\n")
            f.write("\\noindent")
            for annotation in annotations:
                f.write(note_tex(annotation))
        f.write("\n\n")


if __name__ == "__main__":
    main(sys.argv)
