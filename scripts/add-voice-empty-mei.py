import sys
import xml.etree.ElementTree as ET
from copy import deepcopy

PI_HREF = "https://music-encoding.org/schema/5.0/mei-basic.rng"
PI_SCHEMA1 = "http://relaxng.org/ns/structure/1.0"
PI_SCHEMA2 = "http://purl.oclc.org/dsdl/schematron"
XML_NS = "http://www.w3.org/XML/1998/namespace"
MEI_NS = "http://www.music-encoding.org/ns/mei"


ET.register_namespace("xml", XML_NS)
ET.register_namespace("", MEI_NS)
ns = {"mei": MEI_NS, "": XML_NS}
ids_map = {}


def insert_staff_with_rests(mei_file_path, staff_n, label, output_file_path):
    global ids_map, indent
    if output_file_path is None:
        output_file_path = mei_file_path.rsplit(".", 1)[0] + "_modified.mei"

    orig_tree = ET.parse(mei_file_path)
    root = orig_tree.getroot()

    top = ET.Element(None)
    p1 = ET.ProcessingInstruction(
        f"xml-model",
        f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA1}"',
    )
    p2 = ET.ProcessingInstruction(
        f"xml-model",
        f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA2}"',
    )
    p1.tail = "\n"
    p2.tail = "\n"
    top.append(p1)
    top.append(p2)

    root.set("xmlns", MEI_NS)
    top.append(root)

    tree = ET.ElementTree(top)

    for score_def in root.findall(".//mei:scoreDef", ns):
        prev_staff_n = int(staff_n) - 1
        prev_staff_def = score_def.find(f'.//mei:staffDef[@n="{prev_staff_n}"]', ns)

        if prev_staff_def is None:
            print(f'Warning: Could not find staffDef for staff {prev_staff_n} in a scoreDef')
            continue

        new_staff_def = deepcopy(prev_staff_def)
        new_staff_def.set("n", staff_n)

        label_elem = new_staff_def.find("mei:label", ns)
        if label_elem is not None:
            label_elem.text = "Alto"

        labelAbbr_elem = new_staff_def.find("mei:labelAbbr", ns)
        if labelAbbr_elem is not None:
            labelAbbr_elem.text = "A."

        clef_elem = new_staff_def.find("mei:clef", ns)
        old_id = clef_elem.get(f"{{{XML_NS}}}id")
        if old_id is not None:
            new_id = old_id + "_" + str(len(ids_map) + 1)
            clef_elem.set(f"{{{XML_NS}}}id", new_id)
            ids_map[old_id] = new_id

        if "copyof" in clef_elem.attrib:
            ref = clef_elem.get(f"copyof").lstrip("#")
            if ref is not None:
                clef_elem.set("copyof", "#" + ids_map[ref])

        prev_staff_parent = None
        for staffGrp in score_def.findall(".//mei:staffGrp", ns):
            for child in staffGrp:
                if child is prev_staff_def or child == prev_staff_def:
                    prev_staff_parent = staffGrp
                    break
            if prev_staff_parent is not None:
                break

        if prev_staff_parent is None:
            print(f"Warning: Could not find parent of staff {staff_n}")
            continue

        for staff_def in score_def.findall(".//mei:staffDef", ns):
            n = staff_def.get("n")
            if n and n.isdigit() and int(n) >= int(staff_n):
                staff_def.set("n", str(int(n) + 1))

        children = list(prev_staff_parent)
        prev_staff_index = children.index(prev_staff_def)
        prev_staff_parent.insert(prev_staff_index + 1, new_staff_def)

    for measure in root.findall(".//mei:measure", ns):
        new_staff = ET.Element(f"{{{MEI_NS}}}staff")
        new_staff.set("n", staff_n)

        app = ET.SubElement(new_staff, f"{{{MEI_NS}}}app", type="voice_reconstruction")

        lem = ET.SubElement(app, f"{{{MEI_NS}}}lem", label=label[0])
        lem_layer = ET.SubElement(lem, f"{{{MEI_NS}}}layer", n="1")
        lem_rest = ET.SubElement(lem_layer, f"{{{MEI_NS}}}mRest")

        for staff in measure.findall("mei:staff", ns):
            n = staff.get("n")
            if n and n.isdigit() and int(n) >= int(staff_n):
                staff.set("n", str(int(n) + 1))

        prev_staff = None
        prev_staff_index = -1
        for i, child in enumerate(measure):
            if child.tag.endswith("staff") and child.get("n") == staff_n:
                prev_staff = child
                prev_staff_index = i
                break

        if prev_staff is not None:
            measure.insert(prev_staff_index + 1, new_staff)
        else:
            measure.append(new_staff)

    tree.write(
        output_file_path,
        encoding="utf-8",
        xml_declaration=True,
        short_empty_elements=True,
    )
    print(f"Modified MEI file saved to {output_file_path}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(
            "Usage: python add-voice-empty-mei.py [input_mei_file.mei] [staff n] [label] [output_mei_file.mei]"
        )
        sys.exit(1)

    input_file = sys.argv[1]
    staff_n = sys.argv[2]
    label = sys.argv[3:]
    output_file = sys.argv[4]

    insert_staff_with_rests(input_file, staff_n, label, output_file)
