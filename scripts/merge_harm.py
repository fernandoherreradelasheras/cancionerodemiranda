import lxml.etree as ET
import sys
import argparse
import re

xml_ns = 'http://www.w3.org/XML/1998/namespace'
mei_ns = 'http://www.music-encoding.org/ns/mei'

disonancias_map = {
    'P': 'nota de paso ascendente',
    'N': 'bordadura superior',
    'D': 'doble bordadura superior luego inferior',
    'E': 'échappée superior',
    'C': 'nota cambiata corta ascendente',
    'K': 'nota cambiata larga ascendente',
    'A': 'anticipación ascendente',
    'I': 'nota cambiata ascendente inversa',
    'J': 'échappée superior inversa',
    'S': 'suspensión ternaria',
    'G': 'agente de suspensión ternaria',
    'F': 'suspensión falsa abordada por grado ascendente',
    'x': 'resolución contra disonancia de suspensión',
    'M': 'suspensión con agente faltante abordada por grado ascendente',
    'o': 'suspensión puramente ornamental',
    'Q': 'nota de paso ascendente disonante en tercer cuarto',
    'B': 'bordadura superior disonante en tercer cuarto',
    'T': 'apoyatura abordada desde abajo',
    'V': 'nota de paso ascendente acentuada',
    'W': 'bordadura superior acentuada',
    'Y': 'solo disonante contra disonancia conocida asc.',
    'Z': 'disonancia no clasificada, intervalo de 2ª o 7ª',
    'p': 'nota de paso descendente',
    'n': 'bordadura inferior',
    'd': 'doble bordadura inferior luego superior',
    'e': 'échappée inferior',
    'c': 'nota cambiata corta descendente',
    'k': 'nota cambiata larga descendente',
    'a': 'anticipación descendente',
    'i': 'nota cambiata descendente inversa',
    'j': 'échappée inferior inversa',
    's': 'suspensión binaria',
    'g': 'agente de suspensión binaria',
    'f': 'suspensión falsa abordada por grado descendente',
    'r': 'suspensión con nota repetida',
    'm': 'suspensión con agente faltante abordada por grado descendente',
    'h': 'idioma chanson',
    'q': 'nota de paso descendente disonante en tercer cuarto',
    'b': 'bordadura inferior disonante en tercer cuarto',
    't': 'apoyatura abordada desde arriba',
    'v': 'nota de paso descendente acentuada',
    'w': 'bordadura inferior acentuada',
    'y': 'solo disonante contra disonancia conocida desc.',
    'z': 'disonancia no clasificada, intervalo de 4ª'
}


def measures_of(root, mdiv=None):
    """The measures to merge, restricted to a single <mdiv> when asked for.

    mdivs are numbered 1-based over those that hold measures, the same set the
    caller (add_dissonant_analysis.sh) analyses one at a time. Returns None when
    the index is out of range; falls back to the whole document for scores with
    no <mdiv>."""
    if mdiv is None:
        return root.findall(f".//{{{mei_ns}}}measure")
    mdivs = [md for md in root.findall(f".//{{{mei_ns}}}body/{{{mei_ns}}}mdiv")
             if md.find(f".//{{{mei_ns}}}measure") is not None]
    if not mdivs:
        return root.findall(f".//{{{mei_ns}}}measure")
    if not 1 <= mdiv <= len(mdivs):
        print(f"Error: no mdiv {mdiv} in the base file ({len(mdivs)} found)")
        return None
    return mdivs[mdiv - 1].findall(f".//{{{mei_ns}}}measure")


def process_mei_files(file1_path, file2_path, output_path, mdiv=None):

    ET.register_namespace('mei', mei_ns)
    ET.register_namespace('xml', xml_ns)

    try:
        tree1 = ET.parse(file1_path)
        tree2 = ET.parse(file2_path)
    except ET.ParseError as e:
        print(f"Error parsing MEI files: {e}")
        return False
    except FileNotFoundError as e:
        print(f"File not found: {e}")
        return False

    root1 = tree1.getroot()
    root2 = tree2.getroot()

    measures1 = measures_of(root1, mdiv)
    if measures1 is None:
        return False
    measures2 = root2.findall(f".//{{{mei_ns}}}measure")

    if len(measures1) != len(measures2):
        where = f" (mdiv {mdiv})" if mdiv else ""
        print(f"Error: Files have different number of measures. "
              f"File1{where}: {len(measures1)}, File2: {len(measures2)}")
        return False

    # Paired by position, not by @n: fix_mei_measure_ns.xsl numbers the analysis
    # from 1, so the numbering only coincides for the first mdiv of a score.
    for measure1, measure2 in zip(measures1, measures2):
        harm_elements = measure2.findall(f".//{{{mei_ns}}}harm")

        if harm_elements:
            # The apparatus is selected by @type, both on the <app> and on the
            # reading: without it on the <app> score-viewer lists the analysis as
            # an editorial choice instead of handling it as a display option
            app = ET.Element(f"{{{mei_ns}}}app")
            app.set('type', 'dissonant_analysis')

            lem = ET.SubElement(app, f"{{{mei_ns}}}lem")
            rdg = ET.SubElement(app, f"{{{mei_ns}}}rdg")
            rdg.set('type', 'dissonant_analysis')
            
            for harm in harm_elements:
                harm_copy = copy_element_deep(harm, mei_ns)
                process_harm_element(harm_copy, mei_ns)
                rdg.append(harm_copy)
            
            measure1.append(app)
    
    try:
        tree1.write(output_path, encoding='utf-8', xml_declaration=True)
        return True
    except Exception as e:
        print(f"Error writing output file: {e}")
        return False

def copy_element_deep(element, mei_ns):
    new_element = ET.Element(element.tag)
    new_element.attrib.update(element.attrib)
    new_element.text = element.text
    new_element.tail = element.tail
    
    for child in element:
        new_child = copy_element_deep(child, mei_ns)
        new_element.append(new_child)
    
    return new_element

def process_harm_element(harm, mei_ns):
    if f'{{{xml_ns}}}id' in harm.attrib:
        del harm.attrib[f'{{{xml_ns}}}id']
    
    if harm.get('place') == 'below':
        harm.set('place', 'above')
    
    for rend in harm.findall(f".//{{{mei_ns}}}rend"):
        if f'{{{xml_ns}}}id' in rend.attrib:
            del rend.attrib[f'{{{xml_ns}}}id']

        text = rend.text.strip()
        if text in disonancias_map:
            rend.set('label', disonancias_map[text])

        # Unresolved dissonances are rendered in red
        if text and text in ['z', 'Z']:
            rend.set('color', 'red')



def fix_pis(text):
    match = re.search(r'<mei\b', text)
    if not match:
        return text
    head = text[:match.start()]
    body = text[match.start():]
    head = re.sub(r'(\?>)(?=<\?)', r'\1\n', head)
    return head + "\n" + body


def main():
    parser = argparse.ArgumentParser(
        description='Merge harm elements from one MEI file into another applying some tweaks for dissonance visualization'
    )
    parser.add_argument('file1', help='First MEI file (base file)')
    parser.add_argument('file2', help='Second MEI file (harm elements source)')
    parser.add_argument('output', help='Output MEI file path')
    parser.add_argument('--mdiv', type=int, default=None,
                        help='Merge into this mdiv of the base file (1-based, '
                             'counting only mdivs with measures). By default '
                             'the whole file is matched at once.')

    args = parser.parse_args()

    success = process_mei_files(args.file1, args.file2, args.output, args.mdiv)
    if success:
        with open(args.output, 'r', encoding='utf-8') as f:
            xmltext = f.read()
        fixed_xmltext = fix_pis(xmltext)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(fixed_xmltext)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
