#!/usr/bin/env python3
"""
add-slur.py - Add slur, tie, or bracket span elements to MEI files
"""

import argparse
import random
from lxml import etree

# MEI namespace
MEI_NS = "http://www.music-encoding.org/ns/mei"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NSMAP = {None: MEI_NS, 'xml': XML_NS}


def get_or_create_note_id(note_elem):
    """
    Get existing xml:id or create a new one in the form nXXXX
    """
    note_id = note_elem.get(f"{{{XML_NS}}}id")
    if note_id is None:
        # Generate random ID
        note_id = f"n{random.randint(1000, 999999)}"
        note_elem.set(f"{{{XML_NS}}}id", note_id)
    return note_id


def find_note_in_measure(measure, staff_n, note_position):
    """
    Find a note at the given position within a specific staff in a measure.
    
    Args:
        measure: The measure element
        staff_n: Staff number (as string)
        note_position: 1-indexed position of the note
    
    Returns:
        The note element or None if not found
    """
    # Find the staff element with matching @n attribute
    staff = measure.find(f".//{{{MEI_NS}}}staff[@n='{staff_n}']")
    if staff is None:
        return None
    
    # Find all note elements within this staff (including in layers)
    notes = staff.findall(f".//{{{MEI_NS}}}note")
    
    if note_position < 1 or note_position > len(notes):
        return None
    
    # Return the note at the given position (1-indexed)
    return notes[note_position - 1]


def find_measure_by_n(root, measure_n):
    """
    Find a measure element by its @n attribute
    """
    return root.find(f".//{{{MEI_NS}}}measure[@n='{measure_n}']")


def add_slur_or_tie(mei_file, element_type, staff_n, start_measure_n, 
                    start_note_pos, end_measure_n, end_note_pos):
    """
    Add a slur, tie, or bracket span element to the MEI file
    
    Args:
        mei_file: Path to the MEI file
        element_type: 'slur', 'tie', or 'bracketSpan'
        staff_n: Staff number
        start_measure_n: Starting measure number
        start_note_pos: Position of start note in measure
        end_measure_n: Ending measure number
        end_note_pos: Position of end note in measure
    """
    # Parse the MEI file
    tree = etree.parse(mei_file)
    root = tree.getroot()
    
    # Find the start measure
    start_measure = find_measure_by_n(root, str(start_measure_n))
    if start_measure is None:
        raise ValueError(f"Start measure {start_measure_n} not found")
    
    # Find the end measure
    end_measure = find_measure_by_n(root, str(end_measure_n))
    if end_measure is None:
        raise ValueError(f"End measure {end_measure_n} not found")
    
    # Find the start note
    start_note = find_note_in_measure(start_measure, str(staff_n), start_note_pos)
    if start_note is None:
        raise ValueError(f"Start note at position {start_note_pos} in staff {staff_n} "
                        f"of measure {start_measure_n} not found")
    
    # Find the end note
    end_note = find_note_in_measure(end_measure, str(staff_n), end_note_pos)
    if end_note is None:
        raise ValueError(f"End note at position {end_note_pos} in staff {staff_n} "
                        f"of measure {end_measure_n} not found")
    
    # Get or create IDs for both notes
    start_id = get_or_create_note_id(start_note)
    end_id = get_or_create_note_id(end_note)
    
    # Create the appropriate element
    if element_type == 'bracketSpan':
        element = etree.Element(f"{{{MEI_NS}}}bracketSpan", nsmap=NSMAP)
        element.set("func", "coloration")
        element.set("lwidth", "0.5vu")
    else:
        element = etree.Element(f"{{{MEI_NS}}}{element_type}", nsmap=NSMAP)

    element.set("staff", f"{staff_n}")
    element.set("startid", f"#{start_id}")
    element.set("endid", f"#{end_id}")
    
    # Formatting
    element.tail = start_measure.tail
    if start_measure[-1:]:
        start_measure[-1:][0].tail = start_measure[-1:][0].tail + "   "

    start_measure.append(element)
    
    # Write the modified tree back to the file
    tree.write(mei_file, encoding='utf-8', xml_declaration=True, pretty_print=True)
    
    print(f"Successfully added {element_type} from measure {start_measure_n} "
          f"(note {start_note_pos}) to measure {end_measure_n} (note {end_note_pos}) "
          f"in staff {staff_n}")
    print(f"  Start ID: #{start_id}")
    print(f"  End ID: #{end_id}")


def main():
    parser = argparse.ArgumentParser(
        description='Add slur, tie, or bracket span elements to MEI files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s input.mei --slur --staff 3 --start 25 3 --end 26 1
  %(prog)s input.mei --tie --staff 1 --start 10 2 --end 11 1
  %(prog)s input.mei --bs --staff 2 --start 5 1 --end 6 4
        '''
    )
    
    parser.add_argument('mei_file', help='Path to the MEI file')
    
    # Slur, tie, or bracket span option (mutually exclusive)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--slur', action='store_true', help='Add a slur element')
    group.add_argument('--tie', action='store_true', help='Add a tie element')
    group.add_argument('--bs', action='store_true', help='Add a bracket span element for coloration')
    
    parser.add_argument('--staff', type=int, required=True,
                       help='Staff number')
    parser.add_argument('--start', nargs=2, type=int, required=True,
                       metavar=('MEASURE', 'NOTE_POS'),
                       help='Start measure number and note position')
    parser.add_argument('--end', nargs=2, type=int, required=True,
                       metavar=('MEASURE', 'NOTE_POS'),
                       help='End measure number and note position')
    
    args = parser.parse_args()
    
    # Determine element type
    if args.slur:
        element_type = 'slur'
    elif args.tie:
        element_type = 'tie'
    else:  # args.bs
        element_type = 'bracketSpan'
    
    # Call the main function
    try:
        add_slur_or_tie(
            args.mei_file,
            element_type,
            args.staff,
            args.start[0],  # start measure
            args.start[1],  # start note position
            args.end[0],    # end measure
            args.end[1]     # end note position
        )
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())

