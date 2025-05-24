import sys
import xml.etree.ElementTree as ET
from copy import deepcopy

MEI_NS = "http://www.music-encoding.org/ns/mei"
XML_NS = "http://www.w3.org/XML/1998/namespace"
ns = {"mei": MEI_NS, "xml": XML_NS }

def register_namespaces():
    ET.register_namespace("", MEI_NS)
    ET.register_namespace("xml", XML_NS)


def parse_mei_file(file_path):
    try:
        tree = ET.parse(file_path)
        return tree
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        sys.exit(1)


def get_measures(tree):
    root = tree.getroot()
    return root.findall(".//mei:measure", ns)


def get_staff_elements(measure, staff_n):
    return measure.findall(f'.//mei:staff[@n="{staff_n}"]/mei:layer[@n="1"]', ns)


def get_measure_ties(measure):
    return measure.findall(f".//mei:tie", ns)

def get_measure_slurs(measure):
    return measure.findall(f".//mei:slur", ns)

def get_measure_notes(measure, staff_n):
    return measure.findall(f'.//mei:staff[@n="{staff_n}"]/mei:layer[@n="1"]/mei:note', ns)




def get_staff_app_elements(measure, staff_n, elem, label):
    return measure.findall(
        f'.//mei:staff[@n="{staff_n}"]/mei:app[@type="voice_reconstruction"]/mei:{elem}[@label="{label}"]/mei:layer[@n="1"]',
        ns,
    )

def any_element_has_id(elems, xml_id):
    return xml_id and any(f'{{{XML_NS}}}id' in e.attrib and e.attrib[f'{{{XML_NS}}}id'] == xml_id for e in elems)

def replace_staff_content(
    main_file_path, staff_main, elem, label, replacement_file_path, staff_replacement, output_file_path
):
    register_namespaces()

    main_tree = parse_mei_file(main_file_path)
    replacement_tree = parse_mei_file(replacement_file_path)

    main_measures = get_measures(main_tree)
    replacement_measures = get_measures(replacement_tree)

    if len(main_measures) != len(replacement_measures):
        print(
            f"Error: Number of measures doesn't match. Main file: {len(main_measures)}, Replacement file: {len(replacement_measures)}"
        )
        sys.exit(1)

    for i, (main_measure, replacement_measure) in enumerate(
        zip(main_measures, replacement_measures)
    ):
        measure_num = i + 1

        main_staff_elements = get_staff_app_elements(main_measure, staff_main, elem, label)
        if not main_staff_elements:
            print(
                f"Warning: No staff 3 found in measure {measure_num} of the main file"
            )
            continue

        replacement_staff = get_staff_elements(replacement_measure, staff_replacement)

        ties = get_measure_ties(replacement_measure)
        slurs = get_measure_slurs(replacement_measure)
        notes = get_measure_notes(replacement_measure, staff_replacement)
        for element in [*ties, *slurs]:
            startId = element.attrib['startid'][1:]
            if startId and any_element_has_id(notes, startId):
                main_measure.append(deepcopy(element))

        if not replacement_staff:
            print(
                f"Warning: No staff found in measure {measure_num} of the replacement file"
            )
            continue

        for main_staff in main_staff_elements:
            for child in list(main_staff):
                main_staff.remove(child)

            for element in replacement_staff[0]:
                main_staff.append(deepcopy(element))

    main_tree.write(output_file_path, encoding="utf-8", xml_declaration=True)
    print(f"Successfully merged files. Output saved to {output_file_path}")


if __name__ == "__main__":
    if len(sys.argv) != 8:
        print(
            f'Usage: python {sys.argv[0]} [main mei file] [staff] [lem/rdg] [label] [mei file to merge from] [staff] [output]'
        )
        sys.exit(1)

    main_file = sys.argv[1]
    staff_main = sys.argv[2]
    elem = sys.argv[3]
    label = sys.argv[4]
    replacement_file = sys.argv[5]
    staff_replacement= sys.argv[6]
    output_file = sys.argv[7]

    replace_staff_content(main_file, staff_main, elem, label, replacement_file, staff_replacement, output_file)
