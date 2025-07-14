import lxml.etree as ET
import sys
import argparse

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


def process_mei_files(file1_path, file2_path, output_path):
    
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
    
    measures1 = root1.findall(f".//{{{mei_ns}}}measure")
    measures2 = root2.findall(f".//{{{mei_ns}}}measure")
    
    if len(measures1) != len(measures2):
        print(f"Error: Files have different number of measures. "
              f"File1: {len(measures1)}, File2: {len(measures2)}")
        return False
    
    measures1_dict = {}
    measures2_dict = {}
    
    for measure in measures1:
        n_attr = measure.get('n')
        if n_attr:
            measures1_dict[n_attr] = measure
    
    for measure in measures2:
        n_attr = measure.get('n')
        if n_attr:
            measures2_dict[n_attr] = measure
    
    if set(measures1_dict.keys()) != set(measures2_dict.keys()):
        print("Error: Measure numbers don't match between files")
        return False
    
    for measure_n in measures1_dict.keys():
        measure1 = measures1_dict[measure_n]
        measure2 = measures2_dict[measure_n]
        
        harm_elements = measure2.findall(f".//{{{mei_ns}}}harm")
        
        if harm_elements:
            app = ET.Element(f"{{{mei_ns}}}app")
            
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
        print(f"Successfully created output file: {output_path}")
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


def main():
    parser = argparse.ArgumentParser(
        description='Merge harm elements from one MEI file into another applying some tweaks for dissonance visualization'
    )
    parser.add_argument('file1', help='First MEI file (base file)')
    parser.add_argument('file2', help='Second MEI file (harm elements source)')
    parser.add_argument('output', help='Output MEI file path')
    
    args = parser.parse_args()
    
    success = process_mei_files(args.file1, args.file2, args.output)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
