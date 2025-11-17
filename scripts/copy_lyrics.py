#!/usr/bin/env python3
import sys
import xml.etree.ElementTree as ET
import copy

def copy_lyrics(source_file, source_staff, dest_file, dest_staff, target_elem, target_label, output_file=None, start_measure=None, end_measure=None):
    """
    Copy lyrics from source staff to target staff, optionally from different files.
    Args:
        source_file: Path to the MEI file containing source staff
        source_staff: Staff number to copy lyrics from
        dest_file: Path to the MEI file containing destination staff (can be same as source_file)
        dest_staff: Staff number to copy lyrics to
        target_elem: Target element type ('lem' or 'rdg', or None)
        target_label: Label for target element (or None)
        output_file: Output file path (or None to print to stdout)
        start_measure: First measure to process (inclusive, or None for no limit)
        end_measure: Last measure to process (inclusive, or None for no limit)
    """
    XML_NS = "http://www.w3.org/XML/1998/namespace"
    MEI_NS = "http://www.music-encoding.org/ns/mei"

    ET.register_namespace("xml", XML_NS)
    ET.register_namespace("", MEI_NS)
    ns = {"mei": MEI_NS, "": XML_NS}

    # Validate range parameters
    if start_measure is not None and end_measure is not None:
        if start_measure > end_measure:
            raise ValueError(f"start_measure ({start_measure}) cannot be greater than end_measure ({end_measure})")

    # Parse both files
    source_tree = ET.parse(source_file)
    source_root = source_tree.getroot()
    
    # If dest_file is different from source_file, parse it separately
    if dest_file != source_file:
        dest_tree = ET.parse(dest_file)
        dest_root = dest_tree.getroot()
    else:
        dest_tree = source_tree
        dest_root = source_root

    source_measures = source_root.findall('.//mei:measure', ns)
    dest_measures = dest_root.findall('.//mei:measure', ns)

    # Create a dictionary of source measures by measure number for easier lookup
    source_measures_dict = {}
    for measure in source_measures:
        measure_n = measure.get('n')
        if measure_n:
            source_measures_dict[measure_n] = measure

    for dest_measure in dest_measures:
        # Check if this measure is within the specified range
        measure_n = dest_measure.get('n')
        if measure_n is not None:
            try:
                measure_num = int(measure_n)
                # Skip measure if it's outside the specified range
                if start_measure is not None and measure_num < start_measure:
                    continue
                if end_measure is not None and measure_num > end_measure:
                    continue
            except ValueError:
                # If measure number is not a valid integer, skip range checking
                print(f"Warning: Measure has non-numeric number '{measure_n}', processing anyway")
        else:
            # If measure has no number, skip range checking
            print(f"Warning: Measure has no number attribute, processing anyway")

        # Find corresponding source measure
        source_measure = source_measures_dict.get(measure_n)
        if source_measure is None:
            print(f"Warning: Source measure {measure_n} not found, skipping")
            continue

        source_staff_elem = source_measure.find(f'./mei:staff[@n="{source_staff}"]', ns)
        if source_staff_elem is None:
            continue

        target_staff_elem = dest_measure.find(f'.//mei:staff[@n="{dest_staff}"]', ns)
        if target_staff_elem is None:
            continue

        source_notes = source_staff_elem.findall('.//mei:note', ns)
        if target_elem is not None:
            target_notes = target_staff_elem.findall(f'.//mei:app/mei:{target_elem}[@label="{target_label}"]//mei:note', ns)
        else:
            target_notes = target_staff_elem.findall('.//mei:note', ns)

        if len(source_notes) != len(target_notes):
            print(f"Warning: Number of notes doesn't match in measure {measure_n}: {len(source_notes)} != {len(target_notes)}, skipping")
            continue

        for source_note, target_note in zip(source_notes, target_notes):
            source_verse1 = source_note.find('./mei:verse[@n="1"]/mei:syl', ns)
            target_verse1 = target_note.find('./mei:verse[@n="1"]/mei:syl', ns)

            if source_verse1 is None:
                continue

            if target_verse1 is None:
                target_verse1 = copy.deepcopy(source_verse1)
                new_verse = ET.SubElement(target_note, f"{{{MEI_NS}}}verse", n="1")
                new_verse.append(target_verse1)

            if source_verse1.text == target_verse1.text:
                for source_verse in source_note.findall('./mei:verse', ns):
                    verse_n = source_verse.get('n')
                    if verse_n and int(verse_n) > 1:
                        target_verse = target_note.find(f'./mei:verse[@n="{verse_n}"]', ns)
                        if target_verse is None:
                            target_note.append(copy.deepcopy(source_verse))
            else:
                print(f"Content for verse 1 not equal, skipping: {source_verse1.text} != {target_verse1.text}")

    if output_file:
        dest_tree.write(output_file, encoding='utf-8', xml_declaration=True)
    else:
        print(ET.tostring(dest_root, encoding='unicode'))

def main():
    if len(sys.argv) < 5 or len(sys.argv) > 11:
        print("Usage: python copy_lyrics.py <source_file> <source_staff> <dest_file> <dest_staff> [<lem | rdg> <label>] <output_file> [<start_measure> <end_measure>]")
        print("  source_file: MEI file containing the source staff")
        print("  source_staff: Staff number to copy lyrics from")
        print("  dest_file: MEI file containing the destination staff (can be same as source)")
        print("  dest_staff: Staff number to copy lyrics to")
        print("  start_measure and end_measure are optional and define the range of measures to process")
        sys.exit(1)

    source_file = sys.argv[1]
    source_staff = int(sys.argv[2])
    dest_file = sys.argv[3]
    dest_staff = int(sys.argv[4])

    # Parse arguments based on length
    if len(sys.argv) == 6:
        # No target element, no range
        target_elem = None
        target_label = None
        output_file = sys.argv[5]
        start_measure = None
        end_measure = None
    elif len(sys.argv) == 8:
        # Either target element OR range specified
        try:
            # Try to parse as range parameters (last two args are integers)
            start_measure = int(sys.argv[6])
            end_measure = int(sys.argv[7])
            target_elem = None
            target_label = None
            output_file = sys.argv[5]
        except ValueError:
            # Not integers, so it's target element specification
            target_elem = sys.argv[5]
            target_label = sys.argv[6]
            output_file = sys.argv[7]
            start_measure = None
            end_measure = None
    elif len(sys.argv) == 10:
        # Both target element and range specified
        target_elem = sys.argv[5]
        target_label = sys.argv[6]
        output_file = sys.argv[7]
        start_measure = int(sys.argv[8])
        end_measure = int(sys.argv[9])
    else:
        print("Invalid number of arguments")
        sys.exit(1)

    try:
        copy_lyrics(source_file, source_staff, dest_file, dest_staff, target_elem, target_label, output_file, start_measure, end_measure)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)

main()
