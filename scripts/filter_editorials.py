#!/usr/bin/env python3

import sys
import argparse
from lxml import etree


MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {'mei': MEI_NS}

# Elements holding alternative readings, and which branch to keep: the named
# child if it is there, otherwise the first one. A <choice> can pair any two
# branches (corr/sic, orig/reg...), so naming one of them would drop the whole
# element -- and with it the music -- whenever the pair is a different one.
ALTERNATIVES = {'app': ('lem',), 'choice': (), 'subst': ()}

# Editorial elements that only wrap content: replaced by their children.
WRAPPERS = ['corr', 'sic', 'unclear', 'supplied', 'reg']


def promote_children(container, branch):
    """Replace container with the children of branch (one of its children)."""
    parent = container.getparent()
    index = list(parent).index(container)
    for i, child in enumerate(list(branch)):
        parent.insert(index + i, child)
    parent.remove(container)


def pick_branch(element, preferred):
    """The reading to keep: the first preferred child, else the first child."""
    for name in preferred:
        found = element.find(f'{{{MEI_NS}}}{name}')
        if found is not None:
            return found
    children = [c for c in element if isinstance(c.tag, str)]  # skip comments
    return children[0] if children else None


def process_mei_file(input_file):

    try:
        tree = etree.parse(input_file)
        root = tree.getroot()

        # Alternative readings first: they have to be resolved before the
        # wrappers are flattened, or a <choice><corr/><sic/></choice> would end
        # up holding both readings and none of them would be recognized.
        # reversed(document order) means nested markup is resolved innermost
        # first.
        query = ' | '.join(f'.//mei:{name}' for name in ALTERNATIVES)
        for element in reversed(root.xpath(query, namespaces=NSMAP)):
            parent = element.getparent()
            if parent is None:
                continue
            name = etree.QName(element).localname
            branch = pick_branch(element, ALTERNATIVES[name])
            if branch is None:
                parent.remove(element)
            else:
                promote_children(element, branch)

        # editorial elements: move their children one level up and remove them
        for element_name in WRAPPERS:
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

    except Exception as e:
        # A bare `except: sys.exit(1)` used to hide what went wrong.
        print(f"{input_file}: {type(e).__name__}: {e}", file=sys.stderr)
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
