#!/usr/bin/env python3

import sys
import argparse
from lxml import etree


def process_mei_file(input_file):
    
    MEI_NS = 'http://www.music-encoding.org/ns/mei'
    NSMAP = {'mei': MEI_NS}
    
    try:
        tree = etree.parse(input_file)
        root = tree.getroot()

        # editorial elements: move their children one level up and remove them
        for element_name in ['corr', 'sic', 'unclear', 'supplied', 'reg', 'ending']:
            xpath_query = f'.//mei:{element_name}'
            elements = root.xpath(xpath_query, namespaces=NSMAP)
            for element in reversed(elements):
                parent = element.getparent()
                if parent is not None:
                    element_index = list(parent).index(element)
                    children = list(element)
                    for i, child in enumerate(children):
                        parent.insert(element_index + i, child)
                    parent.remove(element)
        
        # choice: find orig children and promote them two levels up (removing choice and orig)
        choice_elements = root.xpath('.//mei:choice', namespaces=NSMAP)
        for choice_element in reversed(choice_elements):
            parent = choice_element.getparent()
            if parent is not None:
                choice_index = list(parent).index(choice_element)
                orig_elements = choice_element.xpath('.//mei:orig', namespaces=NSMAP)
                promoted_children = []
                for orig_element in orig_elements:
                    promoted_children.extend(list(orig_element))
                for i, child in enumerate(promoted_children):
                    parent.insert(choice_index + i, child)
                parent.remove(choice_element)
        
        # app: find lem children and promote them two levels up (removing app and lem)
        app_elements = root.xpath('.//mei:app', namespaces=NSMAP)
        for app_element in reversed(app_elements):
            parent = app_element.getparent()
            if parent is not None:
                app_index = list(parent).index(app_element)
                lem_elements = app_element.xpath('.//mei:lem', namespaces=NSMAP)
                promoted_children = []
                for lem_element in lem_elements:
                    promoted_children.extend(list(lem_element))
                for i, child in enumerate(promoted_children):
                    parent.insert(app_index + i, child)
                parent.remove(app_element)

        # Remove annots and other elements that cause problems to mei2hum 
        for element_name in [ 'annot', 'sb' ]:
            xpath_query = f'.//mei:{element_name}'
            elements = root.xpath(xpath_query, namespaces=NSMAP)
            for element in reversed(elements):
                parent = element.getparent()
                if parent is not None:
                    parent.remove(element)
 
        
        output = etree.tostring(tree, 
                               encoding='UTF-8', 
                               xml_declaration=True, 
                               pretty_print=True)
        
        sys.stdout.buffer.write(output)
        
    except:
        sys.exit(1)


def main():
    
    parser = argparse.ArgumentParser(
        description='Process MEI files by removing editorial elements and promoting their children'
    )
    parser.add_argument('input_file', help='Input MEI file path')
    args = parser.parse_args()
    process_mei_file(args.input_file)


if __name__ == '__main__':
    main()
