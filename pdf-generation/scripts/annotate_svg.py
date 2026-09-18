import os
import json
from lxml import etree

import footnote_wrap

SVG_NS = "http://www.w3.org/2000/svg"
NSMAP = {"svg": SVG_NS}

# Used only if the reserved block turns out to carry no usable geometry, which
# would mean verovio changed how it writes <pgFoot>. The real size and line step
# are read from the rendering (reserved_grid), so the one place the size is
# decided is footnote_wrap.FONT_SIZE_PERCENT, which expand_annots.py puts into
# the MEI before verovio ever runs.
FALLBACK_FONT_HEIGHT = 360


def lines_of(annot):
    """How many lines this note takes once wrapped, text and number included."""
    return len(footnote_wrap.wrap(f'[{annot["n"]}]: {annot["annot"]}'))


def annotations_of_page(root, annotations):
    """The notes whose markers this page shows, in order.

    A note may apply to several voices at once and carry the same number on each
    of them (expand_annots.py); the text belongs on every page that shows one of
    those markers, so any of the ids is a match. Match the id exactly (verovio
    keeps the MEI xml:id; a stray suffix would be "-…"), not a loose substring,
    so a note never lands on the wrong page because one id contains another.
    """
    out = []
    for annot in annotations:
        aids = annot.get("xml:ids") or [annot["xml:id"]]
        if root.xpath(" | ".join(f'.//svg:g[@id="{aid}" or starts-with(@id, "{aid}-")]'
                                 for aid in aids), namespaces=NSMAP):
            out.append(annot)
    return out


def max_lines_per_page(svg_dir, annotations):
    """Lines of footnote text the busiest page of this rendering needs.

    `expand_annots.py` reserves room in `<pgFoot func="all">`, and that reserve
    is the same on every page. Reserving the sum of every note in the tono costs
    each page the height of notes it does not print -- in one tono of 18 notes
    that was 39 lines on all 14 pages, a third of the height, which left one
    system per page where three fitted. The busiest page is what the reserve has
    to cover, so that is what this measures; generate-pdfs renders once to find
    it and renders again with it. See render_mei().
    """
    worst = 0
    for filename in sorted(os.listdir(svg_dir)):
        if not filename.lower().endswith('.svg'):
            continue
        root = etree.parse(os.path.join(svg_dir, filename)).getroot()
        worst = max(worst, sum(lines_of(a) for a in annotations_of_page(root, annotations)))
    return worst


def reserved_grid(pgfoot):
    """(x, y, line height, font size) of the lines expand_annots.py reserved.

    The reserve is a `<rend type="foot-notes">` holding "Notas:" and one `<lb/>`
    per line, which verovio lays out at the `@fontsize` the MEI asked for. Reading
    the result back, rather than assuming a size here, is what keeps the text on
    the baselines that were reserved for it: change
    footnote_wrap.FONT_SIZE_PERCENT and both passes follow, with no second number
    to keep in step.

    The first baseline is the `<rend>`'s own ("Notas:"); the notes start on the
    next one, and the distance between the two is the line height.
    """
    notes_span = pgfoot.xpath('.//svg:tspan[contains(@class, "rend") and '
                              'contains(@data-type, "foot-notes")]', namespaces=NSMAP)
    if not notes_span:
        return 0.0, 0.0, FALLBACK_FONT_HEIGHT, f'{FALLBACK_FONT_HEIGHT}px'
    rend = notes_span[0]

    sized = rend.xpath('.//svg:tspan[@font-size]', namespaces=NSMAP)
    font_size = sized[0].get('font-size') if sized else f'{FALLBACK_FONT_HEIGHT}px'

    # The <rend>'s own x/y, then those of every line <lb/> put after it.
    baselines = []
    for el in [rend] + rend.findall('{%s}tspan' % SVG_NS):
        if 'x' not in el.attrib or 'y' not in el.attrib:
            continue
        try:
            baselines.append((float(el.get('x')), float(el.get('y'))))
        except ValueError:
            print('invalid x y in foot-notes tspan')
    if len(baselines) < 2:
        # No room was reserved, or verovio stopped writing the coordinates; place
        # the text where the block starts and space it by the font size.
        x, y = baselines[0] if baselines else (0.0, 0.0)
        return x, y, FALLBACK_FONT_HEIGHT, font_size

    (_, first), (x, y) = baselines[0], baselines[1]
    return x, y, y - first, font_size


def append_annotation(svg_path, annotations):
    parser = etree.XMLParser(remove_blank_text=True)
    tree = etree.parse(svg_path, parser)
    root = tree.getroot()

    # Find the first <g class="pgFoot">
    pgfoot_g = root.xpath('.//svg:g[contains(@class, "pgFoot")]', namespaces=NSMAP)
    if not pgfoot_g:
        print(f"No <g class='pgFoot'> found in {svg_path}")
        return
    pgfoot = pgfoot_g[0]

    x_val, y_val, line_height, font_size = reserved_grid(pgfoot)
    print(f"Found y coordinate for first line placeholder: {y_val} "
          f"(font {font_size}, line height {line_height})")

    addedAnnotations = 0

    # SVG text does not wrap and neither does verovio's pgFoot, so break each note
    # into fixed-width lines (footnote_wrap, shared with the <lb> space reserved in
    # expand_annots.py so the two passes agree). Each line is its own <tspan>, drawn
    # at the size and on the baselines of the reserved lines it replaces, so line n
    # of the text lands on reserved line n however the size is configured.
    #
    # For each annotation, add a new <text> — but only on the pages that show
    # its markers (annotations_of_page, shared with max_lines_per_page so the
    # room reserved and the text written are measured the same way).
    for annot in annotations_of_page(root, annotations):
        print(f'Adding annotation for {annot["xml:id"]}')
        text_el = etree.Element('{%s}text' % SVG_NS, {"font-size": "0px"})
        for line in footnote_wrap.wrap(f'[{annot["n"]}]: {annot["annot"]}'):
            tspan_el = etree.SubElement(text_el, '{%s}tspan' % SVG_NS, {
                "x": str(x_val),
                "y": str(y_val),
                "text-anchor": 'start',
                "font-size": font_size
            })
            tspan_el.text = line
            y_val += line_height
        pgfoot.append(text_el)
        addedAnnotations = addedAnnotations + 1

    if addedAnnotations == 0:
        foot_notes_rend = pgfoot.xpath('.//svg:tspan[contains(@data-type, "foot-notes") and contains(@class, "rend")]', namespaces=NSMAP)
        for rend in foot_notes_rend:
            rend.getparent().remove(rend)

    tree.write(svg_path, pretty_print=True, encoding="UTF-8", xml_declaration=True)

def main(svg_dir, json_path):
    with open(json_path, encoding="utf-8") as f:
        annotations = json.load(f)

    # Each SVG (a score page) takes only the annotations whose target element it
    # contains (see append_annotation); pages without any drop the placeholder.
    for filename in os.listdir(svg_dir):
        if filename.lower().endswith('.svg'):
            svg_path = os.path.join(svg_dir, filename)
            append_annotation(svg_path, annotations)

def measure(svg_dir, json_path, out_path):
    """Write to `out_path` the lines the busiest page needs. Used between the
    two rendering passes, so it must not touch the SVGs."""
    with open(json_path, encoding="utf-8") as f:
        annotations = json.load(f)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(str(max_lines_per_page(svg_dir, annotations)))


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 5 and sys.argv[1] == "--measure":
        measure(sys.argv[2], sys.argv[3], sys.argv[4])
    elif len(sys.argv) == 3:
        main(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python annotate_svg.py <svg_dir> <annotations.json>\n"
              "       python annotate_svg.py --measure <svg_dir> <annotations.json> <out.txt>")
        sys.exit(1)

