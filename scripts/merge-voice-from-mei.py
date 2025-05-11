import sys
import xml.etree.ElementTree as ET
from copy import deepcopy


def register_namespaces():
    ET.register_namespace("", "http://www.music-encoding.org/ns/mei")
    ET.register_namespace("xml", "http://www.w3.org/XML/1998/namespace")


def parse_mei_file(file_path):
    try:
        tree = ET.parse(file_path)
        return tree
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
        sys.exit(1)


def get_measures(tree):
    root = tree.getroot()
    namespace = {"mei": "http://www.music-encoding.org/ns/mei"}
    return root.findall(".//mei:measure", namespace)


def get_staff_elements(measure, staff_n):
    namespace = {"mei": "http://www.music-encoding.org/ns/mei"}
    return measure.findall(f'.//mei:staff[@n="{staff_n}"]/mei:layer[@n="1"]', namespace)


def get_measure_ties(measure):
    namespace = {"mei": "http://www.music-encoding.org/ns/mei"}
    return measure.findall(f".//mei:tie", namespace)


def get_staff_rdg_elements(measure, staff_n, rdg_label):
    namespace = {"mei": "http://www.music-encoding.org/ns/mei"}
    return measure.findall(
        f'.//mei:staff[@n="{staff_n}"]/mei:app[@type="voice_reconstruction"]/mei:rdg[@label="{rdg_label}"]/mei:layer[@n="1"]',
        namespace,
    )


def replace_staff_content(
    rdg_label, main_file_path, replacement_file_path, output_file_path
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

        staff3_elements = get_staff_rdg_elements(main_measure, "3", rdg_label)
        if not staff3_elements:
            print(
                f"Warning: No staff 3 found in measure {measure_num} of the main file"
            )
            continue

        replacement_staff = get_staff_elements(replacement_measure, "1")
        ties = get_measure_ties(replacement_measure)

        for tie in ties:
            main_measure.append(deepcopy(tie))

        if not replacement_staff:
            print(
                f"Warning: No staff found in measure {measure_num} of the replacement file"
            )
            continue

        for staff3 in staff3_elements:
            for child in list(staff3):
                staff3.remove(child)

            for element in replacement_staff[0]:
                staff3.append(deepcopy(element))

    main_tree.write(output_file_path, encoding="utf-8", xml_declaration=True)
    print(f"Successfully merged files. Output saved to {output_file_path}")


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(
            f'Usage: python {sys.argv[0]} <main_file.mei> <additional_voice_file.mei> <output_file.mei>'
        )
        sys.exit(1)

    rdg_label = sys.argv[1]
    main_file = sys.argv[2]
    replacement_file = sys.argv[3]
    output_file = sys.argv[4]

    replace_staff_content(rdg_label, main_file, replacement_file, output_file)
