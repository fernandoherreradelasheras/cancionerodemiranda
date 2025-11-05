#!/usr/bin/env python3
"""
Flatten staffGrp elements in MEI files so that each scoreDef has only one top-level staffGrp.
"""

import argparse
from lxml import etree


def flatten_staff_groups(scoredef, namespaces):
    """
    Flatten all staffGrp elements within a scoreDef to have a single top-level staffGrp.

    Args:
        scoredef: The scoreDef element to process
        namespaces: Dictionary of XML namespaces
    """
    # Find all staffGrp elements that are direct children of scoreDef
    staff_groups = scoredef.findall('mei:staffGrp', namespaces)

    if not staff_groups:
        return

    # Create a new single staffGrp or use the first one
    if len(staff_groups) > 1:
        # Multiple top-level staffGrp elements - merge them
        new_staff_grp = staff_groups[0]

        # Collect all children from all staffGrp elements
        for staff_grp in staff_groups[1:]:
            for child in staff_grp:
                new_staff_grp.append(child)
            scoredef.remove(staff_grp)

        staff_groups = [new_staff_grp]

    top_staff_grp = staff_groups[0]

    # Recursively flatten nested staffGrp elements
    def flatten_nested(parent_grp):
        """Recursively flatten nested staffGrp elements."""
        nested_groups = parent_grp.findall('mei:staffGrp', namespaces)

        for nested_grp in nested_groups:
            # First, recursively flatten any deeper nesting
            flatten_nested(nested_grp)

            # Get the index of the nested group
            index = list(parent_grp).index(nested_grp)

            # Move all children of the nested group to the parent
            for child in reversed(list(nested_grp)):
                nested_grp.remove(child)
                parent_grp.insert(index, child)

            # Remove the now-empty nested staffGrp
            parent_grp.remove(nested_grp)

    flatten_nested(top_staff_grp)


def process_mei_file(input_file, output_file):
    """
    Process an MEI file to flatten staffGrp elements.

    Args:
        input_file: Path to input MEI file
        output_file: Path to output MEI file
    """
    # Parse the MEI file
    tree = etree.parse(input_file)
    root = tree.getroot()

    # Get the namespace
    namespace = root.nsmap.get(None)
    if namespace:
        namespaces = {'mei': namespace}
    else:
        # Try common MEI namespace if not found
        namespaces = {'mei': 'http://www.music-encoding.org/ns/mei'}

    # Handle case where there's no namespace
    if not namespace:
        # Check if the document uses no namespace
        if root.tag == 'mei' or 'mei' in root.tag.lower():
            # Document might not use namespace
            namespaces = {'mei': ''}

    # Find all scoreDef elements
    # Try with namespace first
    score_defs = root.findall('.//mei:scoreDef', namespaces)

    # If no results and namespace was empty, try without namespace prefix
    if not score_defs and namespaces.get('mei') == '':
        score_defs = root.findall('.//scoreDef')
        namespaces = None

    # Process each scoreDef
    for scoredef in score_defs:
        if namespaces:
            flatten_staff_groups(scoredef, namespaces)
        else:
            # Handle documents without namespace
            flatten_staff_groups_no_ns(scoredef)

    # Write the output file
    tree.write(
        output_file,
        encoding='utf-8',
        xml_declaration=True,
        pretty_print=True
    )
    print(f"Processed file written to: {output_file}")


def flatten_staff_groups_no_ns(scoredef):
    """
    Flatten staffGrp elements for documents without namespace.

    Args:
        scoredef: The scoreDef element to process
    """
    staff_groups = scoredef.findall('staffGrp')

    if not staff_groups:
        return

    if len(staff_groups) > 1:
        new_staff_grp = staff_groups[0]
        for staff_grp in staff_groups[1:]:
            for child in staff_grp:
                new_staff_grp.append(child)
            scoredef.remove(staff_grp)
        staff_groups = [new_staff_grp]

    top_staff_grp = staff_groups[0]

    def flatten_nested(parent_grp):
        nested_groups = parent_grp.findall('staffGrp')
        for nested_grp in nested_groups:
            flatten_nested(nested_grp)
            index = list(parent_grp).index(nested_grp)
            for child in reversed(list(nested_grp)):
                nested_grp.remove(child)
                parent_grp.insert(index, child)
            parent_grp.remove(nested_grp)

    flatten_nested(top_staff_grp)


def main():
    parser = argparse.ArgumentParser(
        description='Flatten staffGrp elements in MEI files so each scoreDef has only one top-level staffGrp.'
    )
    parser.add_argument(
        'input_file',
        help='Path to input MEI file'
    )
    parser.add_argument(
        'output_file',
        nargs='?',
        help='Path to output MEI file (default: input_file with _flat suffix)'
    )

    args = parser.parse_args()

    # Set default output filename if not provided
    if not args.output_file:
        if args.input_file.endswith('.mei'):
            args.output_file = args.input_file[:-4] + '_flat.mei'
        elif args.input_file.endswith('.xml'):
            args.output_file = args.input_file[:-4] + '_flat.xml'
        else:
            args.output_file = args.input_file + '_flat'

    process_mei_file(args.input_file, args.output_file)


if __name__ == '__main__':
    main()
