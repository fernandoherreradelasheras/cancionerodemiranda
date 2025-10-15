#!/usr/bin/env python3
"""
MEI Tie Duplicate Filter
Removes <tie> elements with duplicate xml:id attributes from an MEI file.
"""

import sys
import argparse
from lxml import etree
from collections import defaultdict


def filter_duplicate_ties(input_file, output_file=None):
    """
    Filter out <tie> elements with duplicate xml:id attributes.
    
    Args:
        input_file: Path to input MEI file
        output_file: Path to output MEI file (if None, prints to stdout)
    """
    # Parse the MEI file without validation
    # Use a parser that doesn't enforce ID uniqueness during parsing
    parser = etree.XMLParser(remove_blank_text=True, 
                             dtd_validation=False,
                             load_dtd=False,
                             no_network=True,
                             recover=True)  # recover mode to handle errors
    
    try:
        tree = etree.parse(input_file, parser)
    except Exception as e:
        print(f"Error parsing file: {e}", file=sys.stderr)
        sys.exit(1)
    
    root = tree.getroot()
    
    # Get the MEI namespace
    nsmap = root.nsmap.copy() if root.nsmap else {}
    
    # Handle default namespace - XPath doesn't support empty prefix
    mei_ns = nsmap.get(None)
    if mei_ns:
        # Remove None key and add with 'mei' prefix for XPath
        if None in nsmap:
            del nsmap[None]
        nsmap['mei'] = mei_ns
        tie_xpath = ".//mei:tie"
    else:
        # Check if there's already an 'mei' prefix
        mei_ns = nsmap.get('mei')
        if mei_ns:
            tie_xpath = ".//mei:tie"
        else:
            # No namespace
            tie_xpath = ".//tie"
    
    # Define XML namespace for xml:id attribute
    xml_ns = "http://www.w3.org/XML/1998/namespace"
    xml_id_attr = f"{{{xml_ns}}}id"
    
    # Find all <tie> elements
    if nsmap:
        tie_elements = root.xpath(tie_xpath, namespaces=nsmap)
    else:
        tie_elements = root.xpath(tie_xpath)
    
    # Track xml:id occurrences
    id_tracker = defaultdict(list)
    
    # Collect all ties with their xml:id
    for tie in tie_elements:
        xml_id = tie.get(xml_id_attr)
        if xml_id:
            id_tracker[xml_id].append(tie)
    
    # Remove duplicate ties (keep first occurrence)
    removed_count = 0
    for xml_id, ties in id_tracker.items():
        if len(ties) > 1:
            print(f"Found {len(ties)} ties with xml:id='{xml_id}', keeping first occurrence", 
                  file=sys.stderr)
            # Remove all but the first occurrence
            for tie in ties[1:]:
                parent = tie.getparent()
                if parent is not None:
                    parent.remove(tie)
                    removed_count += 1
    
    print(f"Removed {removed_count} duplicate <tie> element(s)", file=sys.stderr)
    
    # Write output
    if output_file:
        tree.write(output_file, 
                   encoding='utf-8', 
                   xml_declaration=True, 
                   pretty_print=True)
        print(f"Output written to: {output_file}", file=sys.stderr)
    else:
        # Print to stdout
        output = etree.tostring(tree, 
                               encoding='utf-8', 
                               xml_declaration=True, 
                               pretty_print=True)
        sys.stdout.buffer.write(output)


def main():
    parser = argparse.ArgumentParser(
        description='Filter MEI file to remove <tie> elements with duplicate xml:id attributes'
    )
    parser.add_argument('input_file', 
                       help='Input MEI file path')
    parser.add_argument('-o', '--output', 
                       dest='output_file',
                       help='Output MEI file path (default: stdout)')
    
    args = parser.parse_args()
    
    filter_duplicate_ties(args.input_file, args.output_file)


if __name__ == '__main__':
    main()
