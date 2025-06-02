#!/usr/bin/env python3

import sys
import xml.etree.ElementTree as ET
import copy

def copy_lyrics(mei_file, source_staff, target_staff, target_elem, target_label, output_file=None):
    XML_NS = "http://www.w3.org/XML/1998/namespace"
    MEI_NS = "http://www.music-encoding.org/ns/mei"


    ET.register_namespace("xml", XML_NS)
    ET.register_namespace("", MEI_NS)
    ns = {"mei": MEI_NS, "": XML_NS}

    tree = ET.parse(mei_file)
    root = tree.getroot()

    measures = root.findall('.//mei:measure', ns)
    
    for measure in measures:
        source_staff_elem = measure.find(f'./mei:staff[@n="{source_staff}"]', ns)
        if source_staff_elem is None:
            continue
            
        target_staff_elem = measure.find(f'.//mei:staff[@n="{target_staff}"]', ns)
        if target_staff_elem is None:
            continue
            
        source_notes = source_staff_elem.findall('.//mei:note', ns)
        if target_elem is not None:
            target_notes = target_staff_elem.findall(f'.//mei:app/mei:{target_elem}[@label="{target_label}"]//mei:note', ns)
        else:
            target_notes = target_staff_elem.findall('.//mei:note', ns)
        
        if len(source_notes) != len(target_notes):
            print(f"Warning: Number of notes doesn't match in measure {measure.get('n')}: {len(source_notes)} != {len(target_notes)}, skipping")
            continue
            
        for source_note, target_note in zip(source_notes, target_notes):
            source_verse1 = source_note.find('./mei:verse[@n="1"]/mei:syl', ns)
            target_verse1 = target_note.find('./mei:verse[@n="1"]/mei:syl', ns)
            
            if source_verse1 is None or target_verse1 is None:
                continue
                
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
        tree.write(output_file, encoding='utf-8', xml_declaration=True)
    else:
        print(ET.tostring(root, encoding='unicode'))

def main():
    if len(sys.argv) != 5 and len(sys.argv) != 7:
        print("Usage: python copy_lyrics.py <mei_file> <source_staff> <target_staff> [<lem | rdg> <label>] output_file")
        sys.exit(1)
        
    mei_file = sys.argv[1]
    source_staff = int(sys.argv[2])
    target_staff = int(sys.argv[3])
    if len(sys.argv) == 7:
        target_elem = sys.argv[4]
        target_label = sys.argv[5]
        output_file = sys.argv[6]
    else:
        target_elem = None
        target_label = None
        output_file = sys.argv[4]


        
    copy_lyrics(mei_file, source_staff, target_staff, target_elem, target_label, output_file)

if __name__ == "__main__":
    main()

