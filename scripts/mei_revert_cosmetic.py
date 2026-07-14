#!/usr/bin/env python3
"""
Revierte en un fichero MEI (XML) los cambios que NO afectan al contenido
respecto a la version commiteada en git, dejando intactos los cambios reales.

Se consideran cambios cosmeticos (y por tanto se deshacen):
  - El orden de los atributos de un elemento.
  - El formato numerico de los valores (por ejemplo "2.000000" frente a "2").
  - La indentacion de una linea cuyo contenido no cambia.

Cualquier cambio que altere la estructura o el texto (anadir/quitar elementos,
cambiar nombres de etiqueta, cambiar texto, etc.) se mantiene tal cual.

Uso:
    python3 mei_revert_cosmetic.py fichero.mei [otro.mei ...]
    python3 mei_revert_cosmetic.py --rev HEAD~1 fichero.mei
    python3 mei_revert_cosmetic.py --dry-run fichero.mei
"""

import argparse
import difflib
import re
import subprocess
import sys
from decimal import Decimal, InvalidOperation

# ---------------------------------------------------------------------------
# Normalizacion semantica de una linea
# ---------------------------------------------------------------------------

# Captura cada etiqueta XML completa: <...>
TAG_RE = re.compile(r"<[^>]*>")

# Captura pares atributo="valor" o atributo='valor'
ATTR_RE = re.compile(r"""([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")

# Cabecera de etiqueta: barra de cierre opcional, nombre y resto
TAGHEAD_RE = re.compile(r"(/?)\s*([^\s/>]+)(.*)", re.S)

# Valor puramente numerico
NUM_RE = re.compile(r"-?\d+(?:\.\d+)?$")


def norm_value(value):
    """Normaliza un valor de atributo numerico a su forma canonica."""
    if NUM_RE.fullmatch(value):
        try:
            dec = Decimal(value).normalize()
        except InvalidOperation:
            return value
        # 'f' evita notacion exponencial (1E+2 -> 100)
        return format(dec, "f")
    return value


def norm_tag(tag):
    """Reescribe una etiqueta de forma canonica: atributos ordenados y
    valores numericos normalizados. Comentarios, PIs y doctype se dejan igual."""
    if tag.startswith("<!") or tag.startswith("<?"):
        return tag

    inner = tag[1:-1]  # quita < y >
    self_close = inner.rstrip().endswith("/")
    if self_close:
        inner = inner.rstrip()[:-1]

    m = TAGHEAD_RE.match(inner)
    if not m:
        return tag
    slash, name, rest = m.group(1), m.group(2), m.group(3)

    attrs = []
    for am in ATTR_RE.finditer(rest):
        key = am.group(1)
        val = am.group(2) if am.group(2) is not None else am.group(3)
        attrs.append((key, norm_value(val)))
    attrs.sort()

    attr_str = "".join(' {}="{}"'.format(k, v) for k, v in attrs)
    closer = "/" if self_close else ""
    return "<{}{}{}{}>".format(slash, name, attr_str, closer)


def normalize_line(line):
    """Devuelve la forma canonica de una linea para comparar semantica.
    Ignora la indentacion exterior y normaliza todas las etiquetas."""
    stripped = line.strip()
    return TAG_RE.sub(lambda m: norm_tag(m.group(0)), stripped)


# ---------------------------------------------------------------------------
# Acceso a git
# ---------------------------------------------------------------------------

def git_full_name(path):
    """Devuelve la ruta del fichero relativa a la raiz del repositorio."""
    out = subprocess.run(
        ["git", "ls-files", "--full-name", "--", path],
        capture_output=True, text=True,
    )
    name = out.stdout.strip()
    return name or None


def git_committed_lines(path, rev):
    """Devuelve las lineas de la version commiteada (con saltos de linea)."""
    full = git_full_name(path)
    if full is None:
        raise RuntimeError(
            "'{}' no esta versionado en git (o no estas en un repo).".format(path)
        )
    out = subprocess.run(
        ["git", "show", "{}:{}".format(rev, full)],
        capture_output=True, text=True,
    )
    if out.returncode != 0:
        raise RuntimeError(
            "No se pudo obtener {}:{}\n{}".format(rev, full, out.stderr.strip())
        )
    return out.stdout.splitlines(keepends=True)


# ---------------------------------------------------------------------------
# Logica principal de fusion linea a linea
# ---------------------------------------------------------------------------

def revert_cosmetic(committed_lines, working_lines):
    """Construye la version 'limpia' del fichero de trabajo: revierte las
    diferencias cosmeticas y conserva los cambios reales.
    Devuelve (lineas_resultado, num_lineas_revertidas)."""
    sm = difflib.SequenceMatcher(a=committed_lines, b=working_lines, autojunk=False)
    result = []
    reverted = 0

    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            result.extend(working_lines[j1:j2])
        elif op == "insert":
            # Lineas nuevas en el fichero de trabajo: cambio real, se conserva.
            result.extend(working_lines[j1:j2])
        elif op == "delete":
            # Lineas eliminadas respecto al commit: cambio real, se conserva
            # la eliminacion (no se emite nada).
            pass
        elif op == "replace":
            a_block = committed_lines[i1:i2]
            b_block = working_lines[j1:j2]
            if len(a_block) == len(b_block):
                # Mismo numero de lineas: comparamos una a una.
                for a_line, b_line in zip(a_block, b_block):
                    if normalize_line(a_line) == normalize_line(b_line):
                        result.append(a_line)   # solo cambio cosmetico -> revertir
                        reverted += 1
                    else:
                        result.append(b_line)   # cambio real -> conservar
            else:
                # Distinto numero de lineas: cambio estructural, se conserva.
                result.extend(b_block)

    return result, reverted


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def process_file(path, rev, dry_run):
    try:
        committed = git_committed_lines(path, rev)
    except RuntimeError as exc:
        print("[saltado] {}: {}".format(path, exc), file=sys.stderr)
        return False

    with open(path, "r", encoding="utf-8") as fh:
        working = fh.readlines()

    cleaned, reverted = revert_cosmetic(committed, working)

    if cleaned == working:
        print("{}: sin cambios cosmeticos que revertir".format(path))
        return False

    if dry_run:
        print("{}: se revertirian {} linea(s) (dry-run)".format(path, reverted))
        return True

    with open(path, "w", encoding="utf-8") as fh:
        fh.writelines(cleaned)
    print("{}: {} linea(s) revertida(s)".format(path, reverted))
    return True


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Revierte cambios cosmeticos en ficheros MEI respecto a git."
    )
    parser.add_argument("files", nargs="+", help="Fichero(s) MEI a limpiar.")
    parser.add_argument(
        "--rev", default="HEAD",
        help="Revision de git con la que comparar (por defecto HEAD).",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="No escribe nada, solo informa de lo que cambiaria.",
    )
    args = parser.parse_args(argv)

    for path in args.files:
        process_file(path, args.rev, args.dry_run)


if __name__ == "__main__":
    main()
