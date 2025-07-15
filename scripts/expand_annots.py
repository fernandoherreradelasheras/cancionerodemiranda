from lxml import etree
import json
import sys

if len(sys.argv) != 4:
    print(f"Usage: python {sys.argv[0]} <input.mei> <output.mei> <json output>")
    sys.exit(1)

input = sys.argv[1]
output = sys.argv[2]
json_output = sys.argv[3]


MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {"mei": MEI_NS}
etree.register_namespace("mei", MEI_NS)

tree = etree.parse(input)
root = tree.getroot()

# Build a map of xml:id to element
id_map = {el.get("{http://www.w3.org/XML/1998/namespace}id"): el
          for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}

counter = 1
output_json = []

error = False
for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
    plist = annot.get('plist', '')
    ids = [token.lstrip('#') for token in plist.split()]
    annot_text = (annot.text or "").strip()

    # Find the containing <measure> ancestor
    measure = annot
    while measure is not None and etree.QName(measure).localname != "measure":
        measure = measure.getparent()
    if measure is None:
        continue  

    for idval in ids:
        target = id_map.get(idval)
        if target is not None:
            # If not a note, find first descendant note
            if etree.QName(target).localname != 'note':
                note = target.find('.//mei:note', namespaces=NSMAP)
                if note is not None:
                    target = note
                else:
                    continue

            note_id = target.get("{http://www.w3.org/XML/1998/namespace}id")
            if note_id is None:
                print(f"Child note of {idval} does not have xml:id!")
                error = True
                continue

            dir_el = etree.Element('{%s}dir' % MEI_NS, startid='#' + note_id, place="above")
            rend_el = etree.SubElement(dir_el, '{%s}rend' % MEI_NS, fontstyle="normal", color="mediumblue")
            rend_el.text = f'[{counter}]'

            measure.append(dir_el)

            output_json.append({
                "n": str(counter),
                "xml:id": note_id,
                "annot": annot_text
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
        for i in range(1+len(output_json)):
            lb1 = etree.SubElement(rend1, '{%s}lb' % MEI_NS)
            lb1.tail = " " # Invisible space

tree.write(output, pretty_print=True, encoding="UTF-8", xml_declaration=True)

with open(json_output, "w") as f:
    f.write(json.dumps(output_json, ensure_ascii=False, indent=2))

