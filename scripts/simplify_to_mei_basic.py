#!/usr/bin/env python3
"""Write the MEI Basic version of a master MEI.

Resolves the editorial markup with mei_resolve_editorial.py, prunes whatever
MEI Basic cannot express, serializes with Verovio and validates the result
against mei-basic.rng. Nothing is written unless it validates.

    scripts/simplify_to_mei_basic.py tono.mei -o tono-basic.mei
    scripts/simplify_to_mei_basic.py --check $(scripts/get-tonos-mei.sh)
"""

import argparse
import hashlib
import os
import re
import subprocess
import sys
import tempfile
import urllib.request

from lxml import etree

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mei_resolve_editorial import flatten, parse_mei  # noqa: E402

MEI_NS = "http://www.music-encoding.org/ns/mei"
NSMAP = {"mei": MEI_NS}
MEI = "{%s}" % MEI_NS
RNG_NS = "{http://relaxng.org/ns/structure/1.0}"

VEROVIO = os.environ.get("VEROVIO", "verovio")
VEROVIO_RESOURCES = os.environ.get("VEROVIO_RESOURCES")

DEFAULT_SCHEMA_CACHE = os.path.join(
    os.environ.get("XDG_CACHE_HOME", os.path.expanduser("~/.cache")), "mei-schema")

SCHEMA_URL = "https://music-encoding.org/schema/%s/mei-basic.rng"

# Survive the element pruning by hanging off elements that are basic.
EDITORIAL_ATTRS = ("source", "resp", "cert", "evidence", "agent", "reason",
                   "hand", "seq", "sameas", "synch")

NOTE = ("Derivado automatico en MEI Basic. La fuente de verdad es el MEI "
        "maestro; aqui no estan el aparato critico, el texto poetico ni las "
        "marcas de coloracion, que MEI Basic no puede expresar.")

LAYOUT = ("pgHead", "pgHead2", "pgFoot", "pgFoot2")

STRUCTURAL = frozenset(("mei", "music", "body", "mdiv", "score", "scoreDef",
                        "staffGrp", "staffDef", "section", "measure", "staff",
                        "layer"))


def local(el):
    return etree.QName(el).localname if isinstance(el.tag, str) else None


def basic_vocabulary(schema_path):
    """Element names mei-basic.rng actually admits.

    Collecting every declared <element> is not enough: the schema carries
    orphan defines no pattern references, <pgHead> among them.
    """
    rng = etree.parse(schema_path)
    defines = {}
    for define in rng.iter(RNG_NS + "define"):
        defines.setdefault(define.get("name"), []).append(define)

    pending = []
    names = set()
    for start in rng.iter(RNG_NS + "start"):
        pending += [r.get("name") for r in start.iter(RNG_NS + "ref")]
        names |= {e.get("name") for e in start.iter(RNG_NS + "element") if e.get("name")}

    seen = set()
    while pending:
        name = pending.pop()
        if name in seen or name not in defines:
            continue
        seen.add(name)
        for define in defines[name]:
            pending += [r.get("name") for r in define.iter(RNG_NS + "ref")]
            names |= {e.get("name") for e in define.iter(RNG_NS + "element")
                      if e.get("name")}
    return names


def mei_version(tree):
    return (tree.getroot().get("meiversion") or "5.1").split("+")[0]


def fetch_schema(url, cache_dir):
    if not os.path.isdir(cache_dir):
        os.makedirs(cache_dir)
    dest = os.path.join(cache_dir,
                        hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + ".rng")
    if not os.path.exists(dest):
        sys.stderr.write("descargando esquema %s\n" % url)
        with urllib.request.urlopen(url, timeout=60) as fh:
            data = fh.read()
        with open(dest, "wb") as out:
            out.write(data)
    return dest


def title_of(tree):
    for xp in ('//mei:titleStmt/mei:title[@type="main"]/text()',
               '//mei:titleStmt/mei:title/text()'):
        found = tree.xpath(xp, namespaces=NSMAP)
        if found and found[0].strip():
            return found[0].strip()
    return "Sin titulo"


def prune(tree, vocabulary):
    root = tree.getroot()
    title = title_of(tree)

    for head in root.findall(MEI + "meiHead"):
        root.remove(head)
    head = etree.Element(MEI + "meiHead")
    root.insert(0, head)
    file_desc = etree.SubElement(head, MEI + "fileDesc")
    title_stmt = etree.SubElement(file_desc, MEI + "titleStmt")
    etree.SubElement(title_stmt, MEI + "title").text = title
    etree.SubElement(file_desc, MEI + "pubStmt")

    for back in root.xpath("//mei:back", namespaces=NSMAP):
        back.getparent().remove(back)

    dropped = {}
    for el in list(root.iter()):
        name = local(el)
        if name is None or el.getparent() is None:
            continue
        if name not in vocabulary or name in LAYOUT:
            dropped[name] = dropped.get(name, 0) + 1
            el.getparent().remove(el)
            continue
        for attr in EDITORIAL_ATTRS:
            if el.get(attr) is not None:
                del el.attrib[attr]

    for verse in root.xpath("//mei:verse", namespaces=NSMAP):
        if len(verse) == 0:
            verse.getparent().remove(verse)

    return dropped


EXTRA_CONTENT = re.compile(r"Element (\w+) has extra content: (\w+)")
UNEXPECTED = re.compile(r"Did not expect element (\w+) there")
BAD_ATTRIBUTE = re.compile(r"Invalid attribute ([\w.:]+) for element (\w+)")


def find_by_name(tree, name, line):
    candidates = [el for el in tree.getroot().iter()
                  if isinstance(el.tag, str) and local(el) == name]
    for el in candidates:
        if el.sourceline == line:
            return el
    for el in candidates:
        if el.sourceline and el.sourceline >= line:
            return el
    return candidates[0] if candidates else None


def offending_node(tree, error):
    match = EXTRA_CONTENT.search(error.message)
    if match:
        child = find_by_name(tree, match.group(2), error.line)
        parent = child.getparent() if child is not None else None
        if parent is not None and local(parent) == match.group(1):
            return "element", child, match.group(2)
        parent = find_by_name(tree, match.group(1), error.line)
        if parent is not None:
            for child in parent:
                if isinstance(child.tag, str) and local(child) == match.group(2):
                    return "element", child, match.group(2)
        return None
    match = UNEXPECTED.search(error.message)
    if match:
        node = find_by_name(tree, match.group(1), error.line)
        return ("element", node, match.group(1)) if node is not None else None
    match = BAD_ATTRIBUTE.search(error.message)
    if match:
        node = find_by_name(tree, match.group(2), error.line)
        if node is not None and node.get(match.group(1)) is not None:
            return "attribute", node, match.group(1)
    return None


def offends(tree, schema, node):
    """Is `node` still what the schema is complaining about? (Reads the error
    log of the last validate() call, so validate first.)"""
    for error in schema.error_log:
        target = offending_node(tree, error)
        if target and target[1] is node:
            return True
    return False


def empty_structural(tree, schema, node):
    undo = []
    for child in [c for c in node
                  if isinstance(c.tag, str) and local(c) not in STRUCTURAL]:
        undo.append((node.index(child), child))
        node.remove(child)
        if schema.validate(tree) or not offends(tree, schema, node):
            return ["<%s>" % local(c) for _, c in undo]
    for position, child in reversed(undo):
        node.insert(position, child)
    return []


def enforce_schema(tree, schema, max_rounds=40):
    removed = {}
    for _ in range(max_rounds):
        if schema.validate(tree):
            return removed, True
        target = None
        for error in schema.error_log:
            target = offending_node(tree, error)
            if target:
                break
        if not target:
            return removed, False
        kind, node, name = target
        if kind == "element":
            if node.getparent() is None:
                return removed, False
            if name in STRUCTURAL:
                keys = empty_structural(tree, schema, node)
                if not keys:
                    return removed, False
                for key in keys:
                    removed[key] = removed.get(key, 0) + 1
                continue
            node.getparent().remove(node)
            key = "<%s>" % name
        else:
            del node.attrib[name]
            key = "@%s" % name
        removed[key] = removed.get(key, 0) + 1
    return removed, schema.validate(tree)


def reserialize(raw, tree):
    """Keep Verovio's prologue verbatim: etree.tostring() drops the tail of the
    processing instructions before the root and would run them all together."""
    start = raw.find(b"<mei ")
    if start < 0:
        return etree.tostring(tree, encoding="UTF-8", xml_declaration=True)
    return raw[:start] + etree.tostring(tree.getroot(), encoding="UTF-8")


def run_verovio(src, dest):
    cmd = [VEROVIO]
    if VEROVIO_RESOURCES:
        cmd += ["-r", VEROVIO_RESOURCES]
    cmd += ["-t", "mei-basic", "-o", dest, src]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if proc.returncode != 0 or not os.path.exists(dest):
        return proc.stdout.decode("utf-8", "replace").strip()
    return None


def simplify(path, output, cache_dir, reconstruction="", verbose=True):
    """Return (ok, message). Writes only if the result validates."""
    tree = parse_mei(path)
    version = mei_version(tree)
    schema_path = fetch_schema(SCHEMA_URL % version, cache_dir)
    schema = etree.RelaxNG(etree.parse(schema_path))
    vocabulary = basic_vocabulary(schema_path)

    flatten(tree, reconstruction, False, verbose=False)
    dropped = prune(tree, vocabulary)

    tmp_dir = tempfile.mkdtemp(prefix="mei-basic-")
    try:
        pruned = os.path.join(tmp_dir, "pruned.mei")
        serialized = os.path.join(tmp_dir, "basic.mei")
        tree.write(pruned, encoding="UTF-8", xml_declaration=True)

        error = run_verovio(pruned, serialized)
        if error:
            return False, "Verovio fallo: %s" % error.split("\n")[-1]

        with open(serialized, "rb") as fh:
            raw = fh.read()
        result = etree.parse(serialized)
        note = etree.Comment(" " + NOTE + " ")
        note.tail = result.getroot().text
        result.getroot().insert(0, note)
        forced, valid = enforce_schema(result, schema)
        if not valid:
            first = schema.error_log[0]
            return False, ("no valida contra mei-basic %s: linea %s: %s"
                           % (version, first.line, first.message))
        for key, count in forced.items():
            dropped[key] = dropped.get(key, 0) + count
        data = reserialize(raw, result)
    finally:
        for name in os.listdir(tmp_dir):
            os.remove(os.path.join(tmp_dir, name))
        os.rmdir(tmp_dir)

    if output:
        with open(output, "wb") as fh:
            fh.write(data)

    if verbose and dropped:
        detail = ", ".join("%s x%d" % (k, v)
                           for k, v in sorted(dropped.items(), key=lambda x: -x[1]))
        sys.stderr.write("%s: fuera de MEI Basic: %s\n" % (path, detail))
    return True, None


def default_output(path):
    base, ext = os.path.splitext(path)
    return base + "-basic" + ext


def main():
    parser = argparse.ArgumentParser(
        description="Genera la version MEI Basic de un MEI maestro.")
    parser.add_argument("mei", nargs="+", help="fichero(s) MEI maestro(s)")
    parser.add_argument("-o", "--output",
                        help="fichero de salida (solo con un MEI de entrada)")
    parser.add_argument("--check", action="store_true",
                        help="solo comprueba que la conversion sale y valida")
    parser.add_argument("-r", "--reconstruction", default="",
                        help="etiqueta del <rdg> a preferir al resolver los <app>")
    parser.add_argument("--schema-cache", default=DEFAULT_SCHEMA_CACHE)
    parser.add_argument("-q", "--quiet", action="store_true")
    args = parser.parse_args()

    if args.output and len(args.mei) > 1:
        parser.error("-o solo vale con un unico fichero de entrada")

    failures = 0
    for path in args.mei:
        output = None if args.check else (args.output or default_output(path))
        try:
            ok, message = simplify(path, output, args.schema_cache,
                                   args.reconstruction, verbose=not args.quiet)
        except Exception as exc:                                # noqa: BLE001
            ok, message = False, "error inesperado: %s" % exc
        if not ok:
            failures += 1
            sys.stderr.write("%s: ERROR: %s\n" % (path, message))
        elif not args.quiet:
            sys.stderr.write("%s: %s\n" % (path, output or "valida"))

    if not args.quiet:
        sys.stderr.write("\n%d fichero(s), %d con fallos\n"
                         % (len(args.mei), failures))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
