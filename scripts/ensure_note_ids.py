"""
ensure_note_ids.py

expand_annots.py cuelga la llamada a nota al pie de una <note> con xml:id: para
cada elemento referenciado en el @plist de un <annot> busca la nota donde
anclarla y, si le falta el xml:id, se detiene con un error en vez de perder la
nota en silencio.

Este script recorre el MEI, localiza esas notas y añade un xml:id a las que no
lo tengan, sin tocar nada más del documento.

La regla de anclaje es la de mei_annotations.anchor_note(), la misma que usa el
pipeline: el propio elemento si ya es una <note>, la primera <note> que
contenga, o -- para el marcado editorial que envuelve algo *dentro* de una nota,
como <note><corr><accid/></corr></note> o un <verse> corregido -- la nota que lo
contiene a él.

Uso:
    python scripts/ensure_note_ids.py <archivo.mei> [<archivo.mei> ...]

Los archivos se modifican in-place.
"""

from lxml import etree
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pdf-generation" / "scripts"))
import mei_annotations as ann  # noqa: E402

MEI_NS = ann.MEI_NS
NSMAP = ann.NSMAP
XML_ID = ann.XML_ID


def ensure(path):
    """Add the missing xml:id and return the list of ids added."""
    tree = etree.parse(str(path))
    root = tree.getroot()

    id_map = {el.get(XML_ID): el for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}
    existing = set(id_map)
    counter = 1

    def new_id():
        nonlocal counter
        while True:
            candidate = f"genid-{counter}"
            counter += 1
            if candidate not in existing:
                existing.add(candidate)
                return candidate

    added = []
    for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
        for token in annot.get('plist', '').split():
            target = id_map.get(token.lstrip('#'))
            if target is None:
                print(f"Aviso: no se encontró ningún elemento con xml:id='{token.lstrip('#')}'")
                continue
            note = ann.anchor_note(target)
            if note is None or note.get(XML_ID) is not None:
                continue
            note_id = new_id()
            note.set(XML_ID, note_id)
            id_map[note_id] = note
            added.append(note_id)

    if added:
        tree.write(str(path), pretty_print=True, encoding="UTF-8", xml_declaration=True)
    return added


def main(paths):
    for path in paths:
        added = ensure(path)
        if added:
            print(f"{path}: {len(added)} xml:id añadidos: {', '.join(added)}")
        else:
            print(f"{path}: todas las notas necesarias ya tenían xml:id.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(f"Uso: python {sys.argv[0]} <archivo.mei> [<archivo.mei> ...]")
        sys.exit(1)
    main(sys.argv[1:])
