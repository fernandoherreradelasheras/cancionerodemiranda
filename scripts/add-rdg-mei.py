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

def get_parent(root, element):
    for parent in root.iter():
        for child in parent:
            if child == element:
                return parent
    return None




def insert_staff_with_rests(mei_file_path, label, output_file_path):
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

    for lem in root.findall(".//mei:app[@type='voice_reconstruction']/mei:lem[@label='none']", ns):

        new_rdg = deepcopy(lem)
        new_rdg.tag = "rdg"
        new_rdg.set("label", label)
        parent = get_parent(tree, lem)
        parent.append(new_rdg)


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
            f'Usage: python {sys.argv[0]} [input file] [label] [output file]'
        )
        sys.exit(1)

    input_file = sys.argv[1]
    label = sys.argv[2]
    output_file = sys.argv[3]

    insert_staff_with_rests(input_file, label, output_file)
