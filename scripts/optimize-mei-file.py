import sys
import xml.etree.ElementTree as ET
import re
import gzip
import os


def optimize_mei_file(input_file_path, output_file_path=None):
    if output_file_path is None:
        base_name = os.path.splitext(input_file_path)[0]
        output_file_path = f"{base_name}_optimized.mei"

    ET.register_namespace("", "http://www.music-encoding.org/ns/mei")
    ns = {"mei": "http://www.music-encoding.org/ns/mei"}

    tree = ET.parse(input_file_path)
    root = tree.getroot()

    # keep only app -> lem
    for layer in root.findall(
        './/mei:app[@type="voice_reconstruction"]//mei:lem[@label="none"]//mei:layer',
        ns,
    ):
        lem = get_parent(root, layer)
        app = get_parent(root, lem)
        staff = get_parent(root, app)
        staff.remove(app)
        staff.append(layer)

    ET.indent(tree, space="  ", level=0)
    xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    xml_str = minimize_xml(xml_str)

    with open(output_file_path, "wb") as f:
        f.write(xml_str)


def get_parent(root, element):
    for parent in root.iter():
        for child in parent:
            if child == element:
                return parent
    return None


def minimize_xml(xml_str):
    if isinstance(xml_str, bytes):
        xml_str = xml_str.decode("utf-8")

    xml_str = re.sub(r">\s+<", "><", xml_str)
    xml_str = re.sub(r"\s+=\s+", "=", xml_str)
    xml_str = re.sub(r"\s+$", "", xml_str, flags=re.MULTILINE)

    return xml_str.encode("utf-8")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Usage: python {sys.argv[0]} input_mei_file.mei [output_mei_file.mei]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = (
        sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else None
    )

    optimize_mei_file(input_file, output_file)
