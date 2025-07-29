import re
import silabeador
import argparse
import sys

def has_sinalefa(word1, word2):
    """Check if two words form sinalefa (vowel elision between words)"""
    if not word1 or not word2:
        return False
    
    # Remove punctuation from the end of first word and beginning of second
    word1_clean = re.sub(r'[^\w]$', '', word1.lower())
    word2_clean = re.sub(r'^[^\w]', '', word2.lower())
    
    if not word1_clean or not word2_clean:
        return False
    
    vowels = 'aeiouáéíóúü'
    
    # Check if first word ends with vowel and second starts with vowel or 'h' + vowel
    last_char = word1_clean[-1]
    first_char = word2_clean[0]
    
    if last_char in vowels:
        # Second word starts with vowel
        if first_char in vowels:
            return True
        # Second word starts with 'h' + vowel
        if first_char == 'h' and len(word2_clean) > 1 and word2_clean[1] in vowels:
            return True
    
    return False

def count_syllables_with_sinalefa(words, debug=False):
    """Count syllables considering sinalefa between words"""
    if not words:
        return 0
    
    total_syllables = 0
    sinalefa_count = 0
    sinalefa_pairs = []
    
    for i, word in enumerate(words):
        # Count syllables in current word
        clean_word = re.sub(r'[^\w]', '', word.lower())
        if clean_word:
            syllables = silabeador.syllabify(clean_word)
            total_syllables += len(syllables)
        
        # Check for sinalefa with next word
        if i < len(words) - 1:
            if has_sinalefa(word, words[i + 1]):
                sinalefa_count += 1
                sinalefa_pairs.append(f"'{word}' + '{words[i + 1]}'")
    
    if debug and sinalefa_pairs:
        print(f"  Sinalefas found: {', '.join(sinalefa_pairs)}")
    
    return total_syllables - sinalefa_count

def find_verse_breaks(line, target_syllables=8, debug=False):
    """Find where to break a line into verses of target syllables"""
    words = line.split()
    verses = []
    current_verse = []
    
    i = 0
    while i < len(words):
        # Try adding words until we reach target syllables
        test_verse = current_verse + [words[i]]
        syllable_count = count_syllables_with_sinalefa(test_verse, debug)
        
        if syllable_count <= target_syllables:
            current_verse.append(words[i])
            i += 1
        else:
            # If current verse is not empty, save it and start new one
            if current_verse:
                verses.append(' '.join(current_verse))
                current_verse = []
            else:
                # If single word exceeds target, add it anyway
                current_verse.append(words[i])
                verses.append(' '.join(current_verse))
                current_verse = []
                i += 1
    
    # Add remaining words as final verse
    if current_verse:
        verses.append(' '.join(current_verse))
    
    return verses

def process_poem(text, debug=False):
    """Process the poem and break into verses"""
    lines = text.strip().split('\n')
    
    for line_num, line in enumerate(lines, 1):
        if line.strip():
            if debug:
                print(f"Processing line {line_num}: {line.strip()}")
            
            verses = find_verse_breaks(line.strip(), debug=debug)
            for verse in verses:
                syllables = count_syllables_with_sinalefa(verse.split(), debug)
                if debug:
                    print(f"{verse} ({syllables} sílabas)")
                else:
                    print(verse)
            print()  # Empty line between stanzas

def main():
    parser = argparse.ArgumentParser(description='Break Spanish poetry into verses considering sinalefa')
    parser.add_argument('input_file', help='Input file containing the poem')
    parser.add_argument('--debug', action='store_true', help='Show debug information including sinalefa and syllable counts')
    parser.add_argument('--target-syllables', type=int, default=8, help='Target syllables per verse (default: 8)')
    
    args = parser.parse_args()
    
    try:
        with open(args.input_file, 'r', encoding='utf-8') as file:
            poem_text = file.read()
    except FileNotFoundError:
        print(f"Error: File '{args.input_file}' not found.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)
    
    if args.debug:
        # Test example for debug mode
        test_phrase = "siendo mi muerte imposible"
        words = test_phrase.split()
        print(f"Debug test - Phrase: {test_phrase}")
        print(f"Syllables with sinalefa: {count_syllables_with_sinalefa(words, debug=True)}")
        print(f"Sinalefa between 'muerte' and 'imposible': {has_sinalefa('muerte', 'imposible')}")
        print("-" * 50)
        print()
    
    process_poem(poem_text, debug=args.debug)

if __name__ == "__main__":
    main()

