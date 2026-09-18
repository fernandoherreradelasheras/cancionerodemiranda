#!/usr/bin/env python3
"""
mei_check_annot_anchors.py

Comprueba que el aparato crítico de un MEI puede imprimirse como llamadas a
nota al pie, es decir, que expand_annots.py no va a perder ninguna nota ni a
detenerse.

Dos condiciones hacen fallar la generación de PDF, y las dos se detectan aquí:

  * **@plist colgante**: el `<annot>` nombra un xml:id que no existe en el
    documento. La nota queda sin ancla y no se imprime en la partitura.

  * **nota de anclaje sin xml:id**: el elemento referenciado existe, pero la
    nota (o silencio) donde hay que colgar la llamada no lleva xml:id.
    expand_annots.py se detiene con «Child note of ... does not have xml:id!»
    y no se genera el PDF.

La regla de anclaje es la de mei_annotations.anchor_note(), la misma que usa el
pipeline. Las anotaciones que apuntan a algo que no es música (un `<staffDef>`,
por ejemplo, como «Voz reconstruida») no llevan llamada en la partitura por su
propia naturaleza y no se consideran un error.

La segunda condición se arregla con scripts/ensure_note_ids.py; la primera pide
decisión editorial, porque hay que averiguar a qué elemento debía apuntar el
@plist (o crear el elemento editorial que nunca se codificó).

Uso:
    python scripts/mei_check_annot_anchors.py <archivo.mei> [<archivo.mei> ...]
    python scripts/mei_check_annot_anchors.py            # todos los tonos
    python scripts/mei_check_annot_anchors.py --quiet ...  # solo el estado

Estado de salida:
    0  sin problemas
    1  algún problema encontrado
    2  algún archivo no se pudo analizar
"""

from pathlib import Path
import argparse
import subprocess
import sys

from lxml import etree

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pdf-generation" / "scripts"))
import mei_annotations as ann  # noqa: E402

NSMAP = ann.NSMAP
XML_ID = ann.XML_ID


def check(path):
    """Devuelve la lista de problemas del archivo, cada uno como una cadena."""
    root = etree.parse(str(path)).getroot()
    known = {el.get(XML_ID) for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}
    problems = []

    for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
        text = " ".join((annot.text or "").split())[:60]
        for token in annot.get('plist', '').split():
            ref = token.lstrip('#')
            if ref not in known:
                problems.append(
                    f'@plist «{token}» no corresponde a ningún elemento '
                    f'(anotación: «{text}»)')

    # La segunda condición se comprueba sobre los destinos que sí existen, con
    # el mismo recorrido que hace expand_annots.py.
    id_map = {el.get(XML_ID): el for el in root.xpath('//*[@xml:id]', namespaces=NSMAP)}
    for annot in root.xpath('//mei:annot[@plist]', namespaces=NSMAP):
        text = " ".join((annot.text or "").split())[:60]
        for token in annot.get('plist', '').split():
            target = id_map.get(token.lstrip('#'))
            if target is None:
                continue
            note = ann.anchor_note(target)
            if note is not None and note.get(XML_ID) is None:
                problems.append(
                    f'la nota de anclaje de «{token}» no tiene xml:id '
                    f'(anotación: «{text}»)')

    return problems


def project_meis():
    """La lista de MEI del proyecto, la misma que usa mei_attr_order.py."""
    script = Path(__file__).resolve().parent / "get-tonos-mei.sh"
    out = subprocess.run(["sh", str(script)], capture_output=True, text=True)
    return [line for line in out.stdout.splitlines() if line.strip()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="*", help="archivos MEI (por defecto, todos los tonos)")
    parser.add_argument("--quiet", action="store_true",
                        help="no imprimir nada, solo devolver el estado de salida")
    args = parser.parse_args()

    paths = args.files or project_meis()
    if not paths:
        print("No hay archivos que comprobar.", file=sys.stderr)
        return 2

    status = 0
    for path in paths:
        try:
            problems = check(path)
        except Exception as exc:                       # XML ilegible o ausente
            if not args.quiet:
                print(f"{path}: no se pudo analizar: {exc}", file=sys.stderr)
            status = 2
            continue
        if problems:
            status = max(status, 1)
            if not args.quiet:
                print(f"{path}:")
                for problem in problems:
                    print(f"    {problem}")

    return status


if __name__ == "__main__":
    sys.exit(main())
