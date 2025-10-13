import sys
import xml.etree.ElementTree as ET
from copy import deepcopy
import argparse

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


def get_sections(tree):
    """Get all section elements from the MEI file"""
    root = tree.getroot()
    return root.findall(".//mei:section", ns)


def get_measures_in_section(section):
    """Get all measures within a specific section"""
    return section.findall(".//mei:measure", ns)


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
    main_file_path, staff_main, elem, label, replacement_file_path, staff_replacement, output_file_path, 
    section_num=None, measure_start=None, measure_end=None
):
    register_namespaces()

    main_tree = parse_mei_file(main_file_path)
    replacement_tree = parse_mei_file(replacement_file_path)

    if section_num is not None:
        # Section-based merging
        main_sections = get_sections(main_tree)
        
        if section_num < 1 or section_num > len(main_sections):
            print(f"Error: Section {section_num} not found. Available sections: 1-{len(main_sections)}")
            sys.exit(1)
        
        target_section = main_sections[section_num - 1]  # Convert to 0-based index
        main_measures = get_measures_in_section(target_section)
        replacement_measures = get_measures(replacement_tree)
        
        if len(main_measures) != len(replacement_measures):
            print(
                f"Error: Number of measures doesn't match. Section {section_num}: {len(main_measures)} measures, Replacement file: {len(replacement_measures)} measures"
            )
            sys.exit(1)
            
        print(f"Merging into section {section_num} ({len(main_measures)} measures)")
    else:
        # Original behavior - merge entire file
        main_measures = get_measures(main_tree)
        replacement_measures = get_measures(replacement_tree)

        if len(main_measures) != len(replacement_measures):
            print(
                f"Error: Number of measures doesn't match. Main file: {len(main_measures)}, Replacement file: {len(replacement_measures)}"
            )
            sys.exit(1)

    # Determine measure range to process
    if measure_start is not None and measure_end is not None:
        # Validate measure range
        if measure_start < 1 or measure_start > len(main_measures):
            print(f"Error: Start measure {measure_start} is out of range (1-{len(main_measures)})")
            sys.exit(1)
        if measure_end < 1 or measure_end > len(main_measures):
            print(f"Error: End measure {measure_end} is out of range (1-{len(main_measures)})")
            sys.exit(1)
        if measure_start > measure_end:
            print(f"Error: Start measure ({measure_start}) must be less than or equal to end measure ({measure_end})")
            sys.exit(1)
        
        start_idx = measure_start - 1  # Convert to 0-based
        end_idx = measure_end  # End is inclusive, so we don't subtract 1
        print(f"Merging measures {measure_start} to {measure_end}")
    else:
        start_idx = 0
        end_idx = len(main_measures)

    for i, (main_measure, replacement_measure) in enumerate(
        zip(main_measures, replacement_measures)
    ):
        measure_num = i + 1

        # Skip measures outside the specified range
        if i < start_idx or i >= end_idx:
            continue

        if elem is None:
            main_staff_elements = get_staff_elements(main_measure, staff_main)
        else:
            main_staff_elements = get_staff_app_elements(main_measure, staff_main, elem, label)
        
        if not main_staff_elements:
            print(
                f"Warning: No staff {staff_main} found in measure {measure_num}"
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
    parser = argparse.ArgumentParser(
        description="Merge voice from one MEI file into another",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Merge entire file
  python merge-voice-from-mei.py main.mei 3 source.mei 1 output.mei
  
  # Merge with app elements
  python merge-voice-from-mei.py main.mei 3 lem default source.mei 1 output.mei
  
  # Merge into specific section
  python merge-voice-from-mei.py main.mei 3 source.mei 1 output.mei -s 2
  
  # Merge into specific section with app elements
  python merge-voice-from-mei.py main.mei 3 lem default source.mei 1 output.mei -s 2
  
  # Merge measures 5 to 10
  python merge-voice-from-mei.py main.mei 3 source.mei 1 output.mei -m 5 10
  
  # Merge measures 5 to 10 with app elements
  python merge-voice-from-mei.py main.mei 3 lem default source.mei 1 output.mei -m 5 10
        """
    )
    
    parser.add_argument("main_file", help="Main MEI file")
    parser.add_argument("staff_main", help="Staff number in main file")
    parser.add_argument("elem_or_replacement", help="Element type (lem/rdg) or replacement file")
    parser.add_argument("label_or_staff", help="Label for app element or staff number in replacement file")
    parser.add_argument("replacement_or_output", help="Replacement file or output file")
    parser.add_argument("staff_or_output", nargs="?", help="Staff number in replacement file or output file")
    parser.add_argument("output_file", nargs="?", help="Output file")
    parser.add_argument("-s", "--section", type=int, help="Section number to merge into (1-based)")
    parser.add_argument("-m", "--measures", nargs=2, type=int, metavar=("START", "END"), 
                       help="Measure range to merge (1-based, inclusive). Incompatible with -s option.")
    
    args = parser.parse_args()

    # Check for incompatible options
    if args.section is not None and args.measures is not None:
        print("Error: -s (section) and -m (measures) options are mutually exclusive")
        sys.exit(1)

    # Parse arguments based on number provided
    if args.staff_or_output is None:
        # 5 arguments: main_file staff_main replacement_file staff_replacement output_file
        main_file = args.main_file
        staff_main = args.staff_main
        elem = None
        label = None
        replacement_file = args.elem_or_replacement
        staff_replacement = args.label_or_staff
        output_file = args.replacement_or_output
    elif args.output_file is None:
        # 6 arguments: main_file staff_main replacement_file staff_replacement output_file
        main_file = args.main_file
        staff_main = args.staff_main
        elem = None
        label = None
        replacement_file = args.elem_or_replacement
        staff_replacement = args.label_or_staff
        output_file = args.replacement_or_output
    else:
        # 7 arguments: main_file staff_main elem label replacement_file staff_replacement output_file
        main_file = args.main_file
        staff_main = args.staff_main
        elem = args.elem_or_replacement
        label = args.label_or_staff
        replacement_file = args.replacement_or_output
        staff_replacement = args.staff_or_output
        output_file = args.output_file

    # Extract measure range if provided
    measure_start = args.measures[0] if args.measures else None
    measure_end = args.measures[1] if args.measures else None

    replace_staff_content(
        main_file, staff_main, elem, label, replacement_file, staff_replacement, output_file, 
        args.section, measure_start, measure_end
    )
