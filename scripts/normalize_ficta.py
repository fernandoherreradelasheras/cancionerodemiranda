#!/usr/bin/env python3

import argparse
import sys
from lxml import etree

# MEI namespace
MEI_NS = "http://www.music-encoding.org/ns/mei"
NSMAP = {None: MEI_NS}

def process_mei_file(input_file, output_file):
    try:
        parser = etree.XMLParser(remove_blank_text=False)
        tree = etree.parse(input_file, parser)
        root = tree.getroot()
        
        accid_elements = root.xpath('//mei:accid[@func="edit"]', 
                                   namespaces={'mei': MEI_NS})
        
        modifications_count = 0
        
        for accid in accid_elements:
            if 'func' in accid.attrib:
                del accid.attrib['func']
                modifications_count += 1
            
            if 'enclose' in accid.attrib:
                del accid.attrib['enclose']
        
        tree.write(output_file, 
                  encoding='utf-8', 
                  xml_declaration=True, 
                  pretty_print=True)
        
        print(f"Modified {modifications_count} <accid> elements")
        
    except e:
        print(f"Error: {e}")
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(
        description='Process MEI files to modify <accid> elements with func="edit"',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('input_file', 
                       help='Path to the input MEI file')
    parser.add_argument('output_file', 
                       help='Path to the output MEI file')
    
    args = parser.parse_args()
    
    process_mei_file(args.input_file, args.output_file)

if __name__ == "__main__":
    main()

