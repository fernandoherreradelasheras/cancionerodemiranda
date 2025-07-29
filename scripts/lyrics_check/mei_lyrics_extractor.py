#!/usr/bin/env python3
"""
MEI Lyrics Extractor

This script extracts lyrics from MEI (Music Encoding Initiative) files,
creating separate text files for each staff with merged lyrics from all verses.
"""

import xml.etree.ElementTree as ET
import argparse
import os
from collections import defaultdict, OrderedDict
import re

def parse_mei_file(mei_file_path):
    """Parse the MEI file and return the root element."""
    try:
        tree = ET.parse(mei_file_path)
        return tree.getroot()
    except ET.ParseError as e:
        print(f"Error parsing MEI file: {e}")
        return None
    except FileNotFoundError:
        print(f"File not found: {mei_file_path}")
        return None

def get_namespace(root):
    """Extract the MEI namespace from the root element."""
    # MEI files typically use a namespace
    match = re.match(r'\{.*\}', root.tag)
    return match.group(0) if match else ''

def find_all_staves(root, ns):
    """Find all staff definitions in the MEI file."""
    staves = set()
    # Look for staff elements and staff references
    for staff in root.findall(f".//{ns}staff"):
        staff_n = staff.get('n')
        if staff_n:
            staves.add(staff_n)
    
    # Also check staffDef elements
    for staff_def in root.findall(f".//{ns}staffDef"):
        staff_n = staff_def.get('n')
        if staff_n:
            staves.add(staff_n)
    
    return sorted(staves, key=lambda x: int(x) if x.isdigit() else float('inf'))

def find_all_verses(root, ns):
    """Find all verse numbers in the MEI file."""
    verses = set()
    for verse in root.findall(f".//{ns}verse"):
        verse_n = verse.get('n')
        if verse_n:
            verses.add(verse_n)
    return sorted(verses, key=lambda x: int(x) if x.isdigit() else float('inf'))

def extract_lyrics_for_staff_and_verse(root, ns, staff_n, verse_n):
    """Extract lyrics for a specific staff and verse."""
    lyrics = []
    current_word = []
    
    # Find all notes in the specified staff
    for staff in root.findall(f".//{ns}staff[@n='{staff_n}']"):
        # Get all notes in this staff in document order
        notes = staff.findall(f".//{ns}note")
        
        for note in notes:
            # Find verse with matching number
            verse = note.find(f"./{ns}verse[@n='{verse_n}']")
            if verse is not None:
                # Find all syllables in this verse
                syllables = verse.findall(f"./{ns}syl")
                
                for syl in syllables:
                    text = syl.text or ""
                    wordpos = syl.get('wordpos', '')
                    con = syl.get('con', '')
                    
                    # Skip if con="u" (can be ignored)
                    if con == 'u':
                        continue
                    
                    # Handle syllable based on wordpos
                    if wordpos == 'i':  # initial syllable
                        # Start new word - complete any previous word first
                        if current_word:
                            lyrics.append(''.join(current_word))
                            current_word = []
                        current_word.append(text)
                        
                    elif wordpos == 'm':  # middle syllable
                        current_word.append(text)
                        
                    elif wordpos == 't':  # terminal syllable
                        current_word.append(text)
                        # Complete the word
                        lyrics.append(''.join(current_word))
                        current_word = []
                        
                    else:  # wordpos="" or missing - one-syllable word
                        # Complete any current word first
                        if current_word:
                            lyrics.append(''.join(current_word))
                            current_word = []
                        
                        # Add the single syllable as a complete word
                        lyrics.append(text)
                    
                    # Handle con="b" (syllable break within same note)
                    if con == 'b':
                        # Complete current word and prepare for next
                        if current_word:
                            lyrics.append(''.join(current_word))
                            current_word = []
                    
                    # Note: con="d" is ignored - we don't add hyphens in text extraction
    
    # Complete any remaining word
    if current_word:
        lyrics.append(''.join(current_word))
    
    return lyrics

def create_output_filename(input_file, staff_n):
    """Create output filename for a specific staff."""
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    return f"{base_name}_staff_{staff_n}_lyrics.txt"

def main():
    parser = argparse.ArgumentParser(
        description="Extract lyrics from MEI files, creating separate files for each staff"
    )
    parser.add_argument("mei_file", help="Path to the MEI file")
    parser.add_argument("-o", "--output-dir", default=".", 
                       help="Output directory for lyrics files (default: current directory)")
    parser.add_argument("--simple", action="store_true",
                       help="Output simple format without verse labels")
    
    args = parser.parse_args()
    
    # Parse the MEI file
    root = parse_mei_file(args.mei_file)
    if root is None:
        return 1
    
    # Get namespace
    ns = get_namespace(root)
    
    # Find all staves and verses
    staves = find_all_staves(root, ns)
    verses = find_all_verses(root, ns)
    
    if not staves:
        print("No staves found in the MEI file")
        return 1
    
    if not verses:
        print("No verses found in the MEI file")
        return 1
    
    print(f"Found {len(staves)} staves: {', '.join(staves)}")
    print(f"Found {len(verses)} verses: {', '.join(verses)}")
    
    # Create output directory if it doesn't exist
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Process each staff
    for staff_n in staves:
        # Write to file if there are lyrics for any verse
        output_file = os.path.join(args.output_dir, create_output_filename(args.mei_file, staff_n))
        
        has_lyrics = False
        with open(output_file, 'w', encoding='utf-8') as f:
            for verse_n in verses:
                verse_lyrics = extract_lyrics_for_staff_and_verse(root, ns, staff_n, verse_n)
                if verse_lyrics:
                    has_lyrics = True
                    if not args.simple:
                        f.write(f"Verse {verse_n}:\n")
                    f.write(' '.join(verse_lyrics))
                    f.write('\n')
                    if not args.simple:
                        f.write('\n')  # Extra line between verses
        
        if has_lyrics:
            print(f"Created lyrics file for staff {staff_n}: {output_file}")
        else:
            # Remove empty file
            os.remove(output_file)
            print(f"No lyrics found for staff {staff_n}")
    
    return 0

if __name__ == "__main__":
    exit(main())

