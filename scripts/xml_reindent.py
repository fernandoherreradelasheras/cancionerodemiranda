#!/usr/bin/env python3

import sys
import re
import os
from lxml import etree
import argparse
from collections import defaultdict

PROLOG = '''<?xml version="1.0" encoding="UTF-8"?>
<?xml-model href="https://music-encoding.org/schema/5.1/mei-all.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?xml-model href="https://music-encoding.org/schema/5.1/mei-all.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>'''

MEI_VERSION = "5.1"

def separate_prolog_and_content(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    prolog_pattern = re.compile(r"^(<\?.*?\?>)", re.MULTILINE)
    prolog_matches = list(prolog_pattern.finditer(content))

    if not prolog_matches:
        return "", content

    last_match = prolog_matches[-1]
    split_pos = last_match.end()

    prolog = content[:split_pos]
    xml_content = content[split_pos:]

    return prolog, xml_content


def get_hardcoded_prolog():
    return PROLOG


def detect_hierarchical_indent(xml_content):
    lines = xml_content.split("\n")

    indent_by_depth = defaultdict(list)
    current_depth = 0

    for line_num, line in enumerate(lines):
        stripped = line.strip()

        if not stripped or stripped.startswith("<?") or stripped.startswith("<!--"):
            continue

        indent_amount = len(line) - len(line.lstrip())

        is_opening = re.match(r"<[^/][^>]*[^/]>$", stripped) is not None
        is_closing = stripped.startswith("</") and stripped.endswith(">")
        is_self_closing = re.match(r"<[^>]*/>", stripped) is not None

        indent_by_depth[current_depth].append(indent_amount)

        if is_opening and not is_self_closing:
            current_depth += 1
        elif is_closing:
            current_depth = max(0, current_depth - 1)

    indent_per_level = {}
    for depth, indents in indent_by_depth.items():
        if indents:
            indent_counts = {}
            for i in indents:
                indent_counts[i] = indent_counts.get(i, 0) + 1

            most_common = max(indent_counts.items(), key=lambda x: x[1])[0]
            indent_per_level[depth] = most_common

    indent_sizes = []
    for depth in range(1, max(indent_per_level.keys()) + 1, 1):
        if depth in indent_per_level and depth - 1 in indent_per_level:
            diff = indent_per_level[depth] - indent_per_level[depth - 1]
            if diff > 0:
                indent_sizes.append(diff)

    if indent_sizes:
        size_counts = {}
        for size in indent_sizes:
            size_counts[size] = size_counts.get(size, 0) + 1

        indent_size = max(size_counts.items(), key=lambda x: x[1])[0]

        indent_str = " " * indent_size
        return indent_str

    # Default to 2 or 4 spaces if we couldn't determine
    # Check if 2 or 4 spaces are more common in the file
    spaces_2_count = xml_content.count("  <")
    spaces_4_count = xml_content.count("    <")
    return "    " if spaces_4_count >= spaces_2_count else "  "


def extract_comments(xml_content):
    comments = []
    comment_pattern = re.compile(r"(<!--.*?-->)", re.DOTALL)

    for match in comment_pattern.finditer(xml_content):
        placeholder = f"__COMMENT_{len(comments)}__"
        comments.append((placeholder, match.group(1)))
        xml_content = xml_content.replace(match.group(1), placeholder, 1)

    return xml_content, comments


def ensure_mei_element_attributes(xml_content):
    # Pattern to match the opening mei tag
    mei_pattern = re.compile(r'<mei[^>]*>', re.IGNORECASE)

    match = mei_pattern.search(xml_content)
    if match:
        original_tag = match.group(0)
        new_tag = f'<mei xmlns="http://www.music-encoding.org/ns/mei" meiversion="{MEI_VERSION}">'
        xml_content = xml_content.replace(original_tag, new_tag, 1)
        print("Updated <mei> element with correct namespace and version")
    else:
        print("Warning: No <mei> element found in the XML content")

    return xml_content


def reindent_xml(file_path, output_path=None):
    prolog, content = separate_prolog_and_content(file_path)

    normalized_prolog = get_hardcoded_prolog()
    content = ensure_mei_element_attributes(content)

    content_without_comments, comments = extract_comments(content)

    indent_str = detect_hierarchical_indent(content)
    print(f"Detected indentation pattern: '{indent_str.replace(' ', '␣')}'")

    try:
        parser = etree.XMLParser(remove_blank_text=True)
        root = etree.fromstring(content_without_comments.encode("utf-8"), parser)

        pretty_xml = etree.tostring(root, encoding="unicode", pretty_print=True)

        for placeholder, comment in comments:
            pretty_xml = pretty_xml.replace(placeholder, comment)

        lines = pretty_xml.split("\n")
        indented_lines = []
        for line in lines:
            if line.strip():
                leading_spaces = len(line) - len(line.lstrip())
                indent_level = leading_spaces // 2
                new_line = line.lstrip()
                new_line = (indent_str * indent_level) + new_line
                indented_lines.append(new_line)
            else:
                indented_lines.append(line)

        final_xml = normalized_prolog + "\n" + "\n".join(indented_lines)

    except etree.XMLSyntaxError as e:
        print(f"Error parsing XML: {e}")
        print("Trying alternative parsing method...")

        try:
            lines = content.split("\n")
            result_lines = []
            indent_level = 0

            for line in lines:
                if not line.strip():
                    result_lines.append("")
                    continue

                stripped = line.lstrip()

                if (
                    re.search(r"<[^/].*[^/]>$", stripped)
                    and not stripped.startswith("<?")
                    and not stripped.startswith("<!--")
                ):
                    result_lines.append(indent_str * indent_level + stripped)
                    indent_level += 1
                elif stripped.startswith("</"):
                    indent_level = max(0, indent_level - 1)
                    result_lines.append(indent_str * indent_level + stripped)
                else:
                    result_lines.append(indent_str * indent_level + stripped)

            final_xml = normalized_prolog + "\n" + "\n".join(result_lines)

        except Exception as e:
            print(f"Alternative parsing also failed: {e}")
            return False

    if output_path is None:
        output_path = file_path

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(final_xml)

    print(f"Re-indented XML saved to {output_path}")
    return True


def main():
    parser = argparse.ArgumentParser(
        description="Re-indent XML files with minimal changes"
    )
    parser.add_argument("file", help="XML file to process")
    parser.add_argument(
        "-o", "--output", help="Output file (defaults to overwriting the input)"
    )

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File {args.file} not found.")
        return 1

    success = reindent_xml(args.file, args.output)
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
