#!/usr/bin/env python3
import sys
import re
import argparse

# Configuration: patterns to deduplicate
REMOVE_PATTERNS = [
    "y sus memorias",
    "y si le pregunto",
    "que a cada paso",
    "si el amor fuera",
    "ay ofender yo",
    "ay mi corazón",
    "ay ay de baldón",
    "que no sé",
    "sin saber",
    "no sé yo",
    "no no",
    "no sé",
    "que quise",
    "que estima",
    "no puede",
    "yo no sé"
]

def remove_repetitions(text, patterns, debug=False):
    """Remove repetitions of specified patterns from text"""
    original_text = text
    
    for pattern in patterns:
        # Escape special regex characters in the pattern
        escaped_pattern = re.escape(pattern)
        
        # Create regex to match pattern repeated 2 or 3 times
        # This handles cases like "pattern, pattern" or "pattern pattern pattern"
        # We use a loop to catch all repetitions since regex can be tricky with variable repetitions
        previous_text = None
        while previous_text != text:
            previous_text = text
            
            # Match triple repetition first (pattern pattern pattern)
            triple_regex = rf"({escaped_pattern})(\s*[,.]?\s*)(\1)(\s*[,.]?\s*)(\1)"
            text = re.sub(triple_regex, r'\1', text, flags=re.IGNORECASE)
            
            # Match double repetition (pattern pattern)
            double_regex = rf"({escaped_pattern})(\s*[,.]?\s*)(\1)"
            text = re.sub(double_regex, r'\1', text, flags=re.IGNORECASE)
        
        if debug and text != original_text:
            print(f"  Removed repetition of: '{pattern}'", file=sys.stderr)
            original_text = text
    
    return text

def process_line(line, patterns, debug=False):
    """Process a single line and remove repetitions"""
    original_line = line.strip()
    
    if not original_line:
        return original_line
    
    cleaned_line = remove_repetitions(original_line, patterns, debug)
    
    if debug and cleaned_line != original_line:
        print(f"Original: {original_line}", file=sys.stderr)
        print(f"Cleaned:  {cleaned_line}", file=sys.stderr)
        print("---", file=sys.stderr)
    
    return cleaned_line

def main():
    parser = argparse.ArgumentParser(
        description='Remove repetitions of specified patterns from text (handles double and triple repetitions)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  echo "y sus memorias y sus memorias me rinden" | python repetition_filter.py
  echo "y sus memorias y sus memorias y sus memorias" | python repetition_filter.py
  python repetition_filter.py < input.txt > output.txt
  python repetition_filter.py --debug < input.txt
  python repetition_filter.py --add-pattern "nuevo patrón" < input.txt

Current patterns:
''' + '\n'.join(f'  - "{pattern}"' for pattern in REMOVE_PATTERNS)
    )
    
    parser.add_argument('--debug', action='store_true', 
                       help='Show debug information about what was removed')
    parser.add_argument('--add-pattern', action='append', dest='extra_patterns',
                       help='Add additional patterns to remove (can be used multiple times)')
    parser.add_argument('--list-patterns', action='store_true',
                       help='List all patterns and exit')
    
    args = parser.parse_args()
    
    # Combine default patterns with any additional ones
    patterns = REMOVE_PATTERNS.copy()
    if args.extra_patterns:
        patterns.extend(args.extra_patterns)
    
    if args.list_patterns:
        print("Configured repetition patterns:")
        for i, pattern in enumerate(patterns, 1):
            print(f"  {i:2d}. \"{pattern}\"")
        return
    
    if args.debug:
        print(f"Processing with {len(patterns)} repetition patterns:", file=sys.stderr)
        for pattern in patterns:
            print(f"  - \"{pattern}\"", file=sys.stderr)
        print("---", file=sys.stderr)
    
    # Process input line by line
    try:
        for line_num, line in enumerate(sys.stdin, 1):
            try:
                cleaned_line = process_line(line, patterns, args.debug)
                print(cleaned_line)
            except Exception as e:
                print(f"Error processing line {line_num}: {e}", file=sys.stderr)
                print(line.rstrip())  # Output original line on error
                
    except KeyboardInterrupt:
        print("\nInterrupted by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

