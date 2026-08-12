"""Turn the MEI apparatus into numbered footnote markers on the score.

For every editorial note this injects a `<dir>` reading `[n]` above the notes it
applies to, and reserves the matching room in `<pgFoot>`; annotate_svg.py then
writes the text of the notes into that space once the SVG exists.

One annotation is one footnote. It used to be one footnote *per* `@plist`
target, so a note covering four voices was printed four times under four
different numbers; now the affected notes all carry the same number and the
text appears once. The numbering follows musical order (mei_annotations.collect
sorts by the position of the annotated music), not the order the `<annot>`
elements happen to appear in the file -- an annot written under `<section>`
used to take a low number and point into the middle of the piece.

Usage:
    expand_annots.py <input.mei> <output.mei> <annotations.json>
"""

import json
import sys

from lxml import etree

import footnote_wrap
import mei_annotations as ann

MEI_NS = ann.MEI_NS
NSMAP = ann.NSMAP
XML_ID = ann.XML_ID


anchor_note = ann.anchor_note


def marker_text(annotation):
    """The footnote text: the editor's prose plus the qualifiers the MEI
    records (category, reason, certainty, source), same as the printed list of
    the performer edition."""
    qualifiers = annotation.qualifiers()
    tail = f' [{"; ".join(qualifiers)}]' if qualifiers else ''
    return (annotation.text + tail).strip()


def main(input_path, output_path, json_path):
    tree = etree.parse(input_path)
    root = tree.getroot()

    def warn(message):
        print(f'AVISO: {message}', file=sys.stderr)

    annotations = ann.collect(root, warn=warn)

    counter = 1
    output_json = []
    error = False

    for annotation in annotations:
        anchors = {}                      # xml:id -> the event to mark, deduped
        for target in annotation.anchors:
            note = anchor_note(target)
            if note is None:
                continue
            note_id = note.get(XML_ID)
            if note_id is None:
                # Loud on purpose: scripts/ensure_note_ids.py mints the missing
                # ids, and a silent skip here used to lose the note entirely.
                print(f"Child note of {target.get(XML_ID)} does not have xml:id!")
                error = True
                continue
            anchors.setdefault(note_id, note)

        if not anchors:
            warn(f'sin nota donde anclar la llamada, no se imprimirá en la '
                 f'partitura: «{annotation.text[:60]}»')
            continue

        # The same number goes on every voice the note applies to; the <dir>
        # belongs to the measure of the event it points at, which is not
        # necessarily the one the <annot> itself was written under.
        for note_id, note in anchors.items():
            measure = ann.ancestor_or_self(note, 'measure')
            if measure is None:
                continue
            dir_el = etree.Element('{%s}dir' % MEI_NS, startid='#' + note_id, place="above")
            rend_el = etree.SubElement(dir_el, '{%s}rend' % MEI_NS,
                                       fontstyle="normal", color="mediumblue")
            rend_el.text = f'[{counter}]'
            measure.append(dir_el)

        output_json.append({
            "n": str(counter),
            "xml:id": next(iter(anchors)),
            "xml:ids": list(anchors),
            "annot": marker_text(annotation),
        })
        counter += 1

    if error:
        sys.exit(-1)

    # If any annotation has been added, insert notes section to <pgFoot> in every <scoreDef>
    if output_json:
        for scoredef in root.xpath('//mei:scoreDef', namespaces=NSMAP):
            pgfoot = scoredef.find('.//mei:pgFoot', namespaces=NSMAP)
            if pgfoot is None:
                pgfoot = etree.Element('{%s}pgFoot' % MEI_NS, func="all")
                scoredef.append(pgfoot)
                rend1 = etree.SubElement(pgfoot, '{%s}rend' % MEI_NS, halign="left", valign="bottom", type="foot-notes")
            else:
                rend1 = etree.Element('{%s}rend' % MEI_NS, halign="left", valign="top", type="foot-notes")
                pgfoot.insert(0, rend1)

            rend1.text = "Notas:"
            # Reserve one line for "Notas:" plus the exact number of lines each note
            # wraps to. This uses the same footnote_wrap as annotate_svg.py, so the
            # space reserved here matches the text injected there line for line: a
            # single-line note reserves exactly one line (no extra gap), a long note
            # reserves exactly what it needs (no overflow).
            reserved_lines = 1 + sum(
                len(footnote_wrap.wrap(f'[{o["n"]}]: {o["annot"]}'))
                for o in output_json)
            for i in range(reserved_lines):
                lb1 = etree.SubElement(rend1, '{%s}lb' % MEI_NS)
                # A NO-BREAK SPACE (U+00A0), written as an escape so no editor or
                # whitespace-tidying pass can turn it back into a plain space:
                # Verovio drops whitespace-only text between <lb/>s, and then the
                # reserved lines carry no coordinates -- pgFoot claims no height
                # and annotate_svg.py, finding no placed line to start from,
                # falls back to (0,0) and prints every note at the top of the page.
                lb1.tail = "\u00a0 "

    tree.write(output_path, pretty_print=True, encoding="UTF-8", xml_declaration=True)

    with open(json_path, "w") as f:
        f.write(json.dumps(output_json, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(f"Usage: python {sys.argv[0]} <input.mei> <output.mei> <json output>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3])
