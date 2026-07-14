"""
ensure_note_ids.py

expand_annots.py necesita que, para cada elemento referenciado en un
atributo @plist de un <annot>, la primera <note> descendiente (o el propio
elemento, si ya es una <note>) tenga un xml:id. Si falta, expand_annots.py
se detiene con un error.

Este script recorre el MEI, localiza esos casos y añade un xml:id nuevo
a las notas que no lo tengan, sin modificar nada más del documento.

Uso:
    python ensure_note_ids.py <archivo.mei>

El archivo se modifica in-place.
"""

from lxml import etree
import sys

if len(sys.argv) != 2:
    print(f"Uso: python {sys.argv[0]} <archivo.mei>")
    sys.exit(1)

input_path = sys.argv[1]
output_path = input_path

MEI_NS = 'http://www.music-encoding.org/ns/mei'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {"mei": MEI_NS}


def xml_id(el):
    return el.get(f'{{{XML_NS}}}id')


def set_xml_id(el, value):
    el.set(f'{{{XML_NS}}}id', value)


tree = etree.parse(input_path)
root = tree.getroot()

# Mapa de xml:id existentes, para no generar duplicados
id_map = {xml_id(el): el for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}
existing_ids = set(id_map.keys())

counter = 1


def new_id():
    global counter
    while True:
        candidate = f"genid-{counter}"
        counter += 1
        if candidate not in existing_ids:
            existing_ids.add(candidate)
            return candidate


added = []

for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
    plist = annot.get('plist', '')
    ids = [token.lstrip('#') for token in plist.split()]

    for idval in ids:
        target = id_map.get(idval)
        if target is None:
            print(f"Aviso: no se encontró ningún elemento con xml:id='{idval}'")
            continue

        if etree.QName(target).localname != 'note':
            note = target.find('.//mei:note', namespaces=NSMAP)
        else:
            note = target

        if note is None:
            continue

        if xml_id(note) is None:
            new_note_id = new_id()
            set_xml_id(note, new_note_id)
            id_map[new_note_id] = note
            added.append(new_note_id)

if added:
    print(f"Se añadieron {len(added)} xml:id nuevos: {', '.join(added)}")
else:
    print("Todas las notas requeridas ya tenían xml:id. No fue necesario añadir ninguno.")

tree.write(output_path, pretty_print=True, encoding="UTF-8", xml_declaration=True)
