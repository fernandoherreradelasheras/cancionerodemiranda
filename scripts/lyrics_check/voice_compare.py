import os
import argparse
import difflib
import re
from collections import defaultdict, Counter

def extract_voice_number(filename):
    """Extract voice number from filename for cleaner display"""
    # Remove path and extension
    basename = os.path.basename(filename).replace('.txt', '')
    
    # Look for patterns like "voice1", "voice_1", "staff_1", etc.
    patterns = [
        r'voice[_-]?(\d+)',
        r'staff[_-]?(\d+)', 
        r'T[_-]?staff[_-]?(\d+)',
        r'(\d+)[_-]?voice',
        r'(\d+)[_-]?staff'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, basename, re.IGNORECASE)
        if match:
            return f"voice {match.group(1)}"
    
    # If no pattern found, try to extract any number
    numbers = re.findall(r'\d+', basename)
    if numbers:
        return f"voice {numbers[-1]}"  # Use last number found
    
    # Fallback to shortened filename
    return basename[:20] + "..." if len(basename) > 20 else basename

def normalize_text(text):
    """Normalize text for comparison by removing extra spaces and standardizing"""
    # Remove extra whitespace and normalize
    text = re.sub(r'\s+', ' ', text.strip())
    return text.lower()

def read_voice_file(filepath):
    """Read a voice file and return stanzas as lists of verses"""
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Split into stanzas (separated by empty lines)
        stanzas = []
        current_stanza = []
        
        for line in content.split('\n'):
            line = line.strip()
            if line:
                current_stanza.append(line)
            else:
                if current_stanza:
                    stanzas.append(current_stanza)
                    current_stanza = []
        
        # Add final stanza if exists
        if current_stanza:
            stanzas.append(current_stanza)
            
        return stanzas
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return []

def compare_voices(voice_files, debug=False):
    """Compare multiple voice files and detect differences"""
    
    # Read all voice files with simplified names
    voices_data = {}
    voice_name_mapping = {}
    
    for voice_file in voice_files:
        voice_name = extract_voice_number(voice_file)
        voices_data[voice_name] = read_voice_file(voice_file)
        voice_name_mapping[voice_name] = voice_file
    
    if not voices_data:
        print("No voice files could be read.")
        return
    
    # Get the maximum number of stanzas
    max_stanzas = max(len(stanzas) for stanzas in voices_data.values())
    
    print(f"Comparing {len(voices_data)} voices with up to {max_stanzas} stanzas each")
    print("Voice mapping:")
    for voice_name, filepath in sorted(voice_name_mapping.items()):
        print(f"  {voice_name}: {os.path.basename(filepath)}")
    print()
    
    differences_found = False
    
    # Compare stanza by stanza
    for stanza_idx in range(max_stanzas):
        print(f"=== STANZA {stanza_idx + 1} ===")
        
        # Get this stanza from all voices
        stanza_data = {}
        max_verses = 0
        
        for voice_name, stanzas in voices_data.items():
            if stanza_idx < len(stanzas):
                stanza_data[voice_name] = stanzas[stanza_idx]
                max_verses = max(max_verses, len(stanzas[stanza_idx]))
            else:
                stanza_data[voice_name] = []
        
        # Compare verse by verse within this stanza
        stanza_has_differences = False
        
        for verse_idx in range(max_verses):
            verse_texts = {}
            
            # Collect this verse from all voices
            for voice_name, verses in stanza_data.items():
                if verse_idx < len(verses):
                    verse_texts[voice_name] = verses[verse_idx]
                else:
                    verse_texts[voice_name] = ""
            
            # Normalize texts for comparison
            normalized_verses = {voice: normalize_text(text) for voice, text in verse_texts.items()}
            
            # Find unique versions
            unique_versions = {}
            for voice, normalized_text in normalized_verses.items():
                found = False
                for existing_text, voices_list in unique_versions.items():
                    if normalized_text == existing_text:
                        voices_list.append(voice)
                        found = True
                        break
                if not found:
                    unique_versions[normalized_text] = [voice]
            
            # If more than one unique version, we have differences
            if len(unique_versions) > 1:
                stanza_has_differences = True
                differences_found = True
                
                print(f"\nVerse {verse_idx + 1} - DIFFERENCES FOUND:")
                
                # Sort versions by number of voices (most common first)
                sorted_versions = sorted(unique_versions.items(), 
                                       key=lambda x: len(x[1]), reverse=True)
                
                for version_text, voices_with_this_version in sorted_versions:
                    # Sort voice names naturally (voice 1, voice 2, etc.)
                    sorted_voices = sorted(voices_with_this_version, 
                                         key=lambda x: int(re.search(r'\d+', x).group()) if re.search(r'\d+', x) else 0)
                    
                    # Get the original text from one of the voices
                    original_text = verse_texts[voices_with_this_version[0]]
                    
                    print(f"  {', '.join(sorted_voices)}: \"{original_text}\"")
                
                if debug:
                    # Show detailed character-by-character differences
                    versions_list = list(unique_versions.keys())
                    if len(versions_list) >= 2:
                        diff = difflib.unified_diff(
                            versions_list[0].splitlines(keepends=True),
                            versions_list[1].splitlines(keepends=True),
                            fromfile='Version 1',
                            tofile='Version 2',
                            lineterm=''
                        )
                        print("  Detailed diff:")
                        for line in diff:
                            print(f"    {line}")
        
        if not stanza_has_differences:
            print("No differences found in this stanza.")
        
        print()
    
    if not differences_found:
        print("✅ All voices are identical!")
    else:
        print("❌ Differences found between voices.")

def find_most_common_version(voice_files):
    """Find the most common version across all voices for each verse"""
    voices_data = {}
    voice_name_mapping = {}
    
    for voice_file in voice_files:
        voice_name = extract_voice_number(voice_file)
        voices_data[voice_name] = read_voice_file(voice_file)
        voice_name_mapping[voice_name] = voice_file
    
    max_stanzas = max(len(stanzas) for stanzas in voices_data.values())
    
    print("=== MOST COMMON VERSIONS ===")
    print("Voice mapping:")
    for voice_name, filepath in sorted(voice_name_mapping.items()):
        print(f"  {voice_name}: {os.path.basename(filepath)}")
    print()
    
    for stanza_idx in range(max_stanzas):
        print(f"Stanza {stanza_idx + 1}:")
        
        stanza_data = {}
        max_verses = 0
        
        for voice_name, stanzas in voices_data.items():
            if stanza_idx < len(stanzas):
                stanza_data[voice_name] = stanzas[stanza_idx]
                max_verses = max(max_verses, len(stanzas[stanza_idx]))
        
        for verse_idx in range(max_verses):
            verse_texts = []
            original_texts = []
            
            for voice_name, verses in stanza_data.items():
                if verse_idx < len(verses):
                    verse_texts.append(normalize_text(verses[verse_idx]))
                    original_texts.append(verses[verse_idx])
            
            if verse_texts:
                # Find most common version
                counter = Counter(verse_texts)
                most_common = counter.most_common(1)[0]
                
                # Find original (non-normalized) version
                for i, normalized_text in enumerate(verse_texts):
                    if normalized_text == most_common[0]:
                        count_info = f" ({most_common[1]}/{len(verse_texts)} voices)" if most_common[1] < len(verse_texts) else ""
                        print(f"  {original_texts[i]}{count_info}")
                        break
        print()

def main():
    parser = argparse.ArgumentParser(description='Compare voice files from MEI extraction')
    parser.add_argument('directory', help='Directory containing voice files')
    parser.add_argument('--debug', action='store_true', help='Show detailed differences')
    parser.add_argument('--consensus', action='store_true', help='Show most common version for each verse')
    parser.add_argument('--pattern', default='*.txt', help='File pattern to match (default: *.txt)')
    
    args = parser.parse_args()
    
    # Find voice files
    import glob
    pattern = os.path.join(args.directory, args.pattern)
    voice_files = sorted(glob.glob(pattern))
    
    if not voice_files:
        print(f"No files found matching pattern: {pattern}")
        return
    
    if args.consensus:
        find_most_common_version(voice_files)
    else:
        compare_voices(voice_files, debug=args.debug)

if __name__ == "__main__":
    main()

