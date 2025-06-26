import os
import json
from lxml import etree

SVG_NS = "http://www.w3.org/2000/svg"
NSMAP = {"svg": SVG_NS}

FONT_HEIGHT = 360

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

    # Find the last <text> in this <g>
    notes_span = pgfoot.xpath('.//svg:tspan[contains(@class, "rend") and contains(@data-type, "foot-notes")]', namespaces=NSMAP)
    x_val = 0
    y_val = 0
    if notes_span:
        tspans = notes_span[0].findall('{%s}tspan' % SVG_NS)
        for tspan in tspans:
            if 'x' not in tspan.attrib or 'y' not in tspan.attrib:
                continue
            x = tspan.get('x', '0')
            y = tspan.get('y', '0')
            try:
                x_val = float(x)
                y_val = float(y)
            except ValueError:
                print('invalid x y in foot-notes tspan')
    else:
        print("cannot find foot-notes")

    addedAnnotations = 0

    # For each annotation, add a new <text>
    for annot in annotations:
        element_with_id = root.xpath(f'.//svg:g[contains(@id, "{annot["xml:id"]}")]', namespaces=NSMAP)
        if not element_with_id:
            continue
        print(f'Adding annotation for {annot["xml:id"]}')
        text_el = etree.Element('{%s}text' % SVG_NS, {"font-size": "0px"})
        tspan_el = etree.SubElement(text_el, '{%s}tspan' % SVG_NS, {
            "x": str(x_val),
            "y": str(y_val),
            "text-anchor": 'start',
            "font-size": f'{FONT_HEIGHT}px'
        })
        tspan_el.text = f'{annot["n"]}: {annot["annot"]}'
        pgfoot.append(text_el)
        addedAnnotations = addedAnnotations + 1
        y_val += FONT_HEIGHT

    if addedAnnotations == 0:
        foot_notes_rend = pgfoot.xpath('.//svg:tspan[contains(@data-type, "foot-notes") and contains(@class, "rend")]', namespaces=NSMAP)
        for rend in foot_notes_rend:
            rend.getparent().remove(rend)

    tree.write(svg_path, pretty_print=True, encoding="UTF-8", xml_declaration=True)

def main(svg_dir, json_path):
    with open(json_path, encoding="utf-8") as f:
        annotations = json.load(f)

    # You may want to filter which annotations go to which SVG file.
    # For now, applies all annotations to all SVGs in the directory.
    for filename in os.listdir(svg_dir):
        if filename.lower().endswith('.svg'):
            svg_path = os.path.join(svg_dir, filename)
            append_annotation(svg_path, annotations)
            print(f"Annotated {svg_path}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python annotate_svg.py <svg_dir> <annotations.json>")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])

