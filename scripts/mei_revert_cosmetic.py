#!/usr/bin/env python3
"""
Reverts changes in a MEI (XML) file that do NOT affect the content,
compared to the version committed in git, leaving real changes intact.

The following are considered cosmetic changes (and are therefore reverted):
  - The order of an element's attributes.
  - The numeric format of values, including zeros added or removed to
    the right of the decimal part (for example "2.000000" versus "2",
    or "3.5" versus "3.500000").
  - The indentation of a line whose content does not change.
  - The relative order of <bracketSpan>, <app>, <slur> and <tie> when they
    are direct children of the same <measure> (the order of other elements,
    such as <note> inside <layer>, is relevant and is not touched).

Any change that alters the structure or the text (adding/removing elements,
changing tag names, changing text, etc.) is kept as is.

Usage:
    python3 mei_revert_cosmetic.py file.mei [other.mei ...]
    python3 mei_revert_cosmetic.py --rev HEAD~1 file.mei
    python3 mei_revert_cosmetic.py --dry-run file.mei
"""

import argparse
import difflib
import re
import subprocess
import sys
from decimal import Decimal, InvalidOperation

TAG_RE = re.compile(r"<[^>]*>")
ATTR_RE = re.compile(r"""([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')""")
TAGHEAD_RE = re.compile(r"(/?)\s*([^\s/>]+)(.*)", re.S)
NUM_RE = re.compile(r"-?\d+(?:\.\d+)?$")


def norm_value(value):
    if NUM_RE.fullmatch(value):
        try:
            dec = Decimal(value).normalize()
        except InvalidOperation:
            return value
        # 'f' evita notacion exponencial (1E+2 -> 100)
        return format(dec, "f")
    return value


def norm_tag(tag):
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
    stripped = line.strip()
    return TAG_RE.sub(lambda m: norm_tag(m.group(0)), stripped)


REORDERABLE_TAGS = {"bracketSpan", "app", "slur", "tie"}

MEASURE_OPEN_RE = re.compile(r"<measure\b[^>]*>")
MEASURE_CLOSE_RE = re.compile(r"</measure\s*>")
MEASURE_N_RE = re.compile(r"""\bn\s*=\s*(?:"([^"]*)"|'([^']*)')""")


def _tag_kind_and_name(tag_text):
    if tag_text.startswith("<!") or tag_text.startswith("<?"):
        return None
    inner = tag_text[1:-1]
    if inner.startswith("/"):
        name = inner[1:].strip().rstrip("/").split()[0] if inner[1:].strip() else ""
        return ("closing", name)
    stripped = inner.rstrip()
    self_closing = stripped.endswith("/")
    if self_closing:
        stripped = stripped[:-1]
    name = stripped.split()[0] if stripped.split() else ""
    return ("selfclosing" if self_closing else "opening", name)


def find_direct_children(lines, start, end):
    children = []
    depth = 0
    child_start = None
    child_tag = None
    for idx in range(start, end):
        for tag_text in TAG_RE.findall(lines[idx]):
            parsed = _tag_kind_and_name(tag_text)
            if parsed is None:
                continue
            kind, name = parsed
            if depth == 0:
                if kind == "closing":
                    continue  # inesperado; se ignora por robustez
                elif kind == "selfclosing":
                    children.append((name, idx, idx))
                else:
                    child_start, child_tag, depth = idx, name, 1
            else:
                if kind == "closing":
                    depth -= 1
                    if depth == 0:
                        children.append((child_tag, child_start, idx))
                        child_start, child_tag = None, None
                elif kind == "opening":
                    depth += 1
    return children


def find_measures(lines):
    measures = []
    i, n = 0, len(lines)
    while i < n:
        m = MEASURE_OPEN_RE.search(lines[i])
        if m and not m.group(0).rstrip().endswith("/>"):
            nm = MEASURE_N_RE.search(m.group(0))
            n_value = (nm.group(1) if nm.group(1) is not None else nm.group(2)) if nm else None
            j = i + 1
            while j < n and not MEASURE_CLOSE_RE.search(lines[j]):
                j += 1
            if j < n:
                measures.append({"content_start": i + 1, "content_end": j, "n": n_value})
                i = j + 1
                continue
        i += 1
    return measures


def _element_signature(lines, start, end):
    return tuple(normalize_line(l) for l in lines[start:end + 1])


def _reordered_measure_children(committed_lines, c_measure, working_lines, w_measure):
    c_children = find_direct_children(committed_lines, c_measure["content_start"], c_measure["content_end"])
    w_children = find_direct_children(working_lines, w_measure["content_start"], w_measure["content_end"])

    if len(c_children) != len(w_children):
        return None

    for (c_tag, _, _), (w_tag, _, _) in zip(c_children, w_children):
        c_is_wl = c_tag in REORDERABLE_TAGS
        w_is_wl = w_tag in REORDERABLE_TAGS
        if c_is_wl != w_is_wl:
            return None  # el "esqueleto" de etiquetas no coincide: cambio real
        if not c_is_wl and c_tag != w_tag:
            return None

    c_wl = [(idx, _element_signature(committed_lines, cs, ce))
            for idx, (tag, cs, ce) in enumerate(c_children) if tag in REORDERABLE_TAGS]
    w_wl = [(idx, _element_signature(working_lines, ws, we))
            for idx, (tag, ws, we) in enumerate(w_children) if tag in REORDERABLE_TAGS]

    from collections import Counter
    if Counter(sig for _, sig in c_wl) != Counter(sig for _, sig in w_wl):
        return None  # no es una simple reordenacion: hay contenido distinto

    if [sig for _, sig in c_wl] == [sig for _, sig in w_wl]:
        return None  # ya estan en el mismo orden, nada que hacer

    pool = list(w_wl)
    used = [False] * len(pool)
    assignment = []  # indices en w_children, en el orden commiteado
    for _, c_sig in c_wl:
        for p_i, (w_idx, w_sig) in enumerate(pool):
            if not used[p_i] and w_sig == c_sig:
                used[p_i] = True
                assignment.append(w_idx)
                break

    new_lines = []
    wl_pointer = 0
    for (c_tag, _, _), (w_tag, ws, we) in zip(c_children, w_children):
        if c_tag in REORDERABLE_TAGS:
            w_idx = assignment[wl_pointer]
            wl_pointer += 1
            _, real_ws, real_we = w_children[w_idx]
            new_lines.extend(working_lines[real_ws:real_we + 1])
        else:
            new_lines.extend(working_lines[ws:we + 1])
    return new_lines


def reorder_measure_children(committed_lines, working_lines):
    committed_measures = find_measures(committed_lines)
    working_measures = find_measures(working_lines)

    committed_by_n = {}
    seen_twice = set()
    for cm in committed_measures:
        if cm["n"] is None:
            continue
        if cm["n"] in committed_by_n:
            seen_twice.add(cm["n"])
        else:
            committed_by_n[cm["n"]] = cm
    for n_value in seen_twice:
        del committed_by_n[n_value]  # numero de compas ambiguo: no se empareja

    result = []
    last = 0
    reordered = 0
    for wm in working_measures:
        cm = committed_by_n.get(wm["n"]) if wm["n"] is not None else None
        if cm is None:
            continue
        new_children = _reordered_measure_children(committed_lines, cm, working_lines, wm)
        if new_children is None:
            continue
        result.extend(working_lines[last:wm["content_start"]])
        result.extend(new_children)
        last = wm["content_end"]
        reordered += 1

    result.extend(working_lines[last:])
    return result, reordered



def git_full_name(path):
    out = subprocess.run(
        ["git", "ls-files", "--full-name", "--", path],
        capture_output=True, text=True,
    )
    name = out.stdout.strip()
    return name or None


def git_committed_lines(path, rev):
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


def revert_cosmetic(committed_lines, working_lines):
    norm_committed = [normalize_line(line) for line in committed_lines]
    norm_working = [normalize_line(line) for line in working_lines]

    sm = difflib.SequenceMatcher(a=norm_committed, b=norm_working, autojunk=False)
    result = []
    reverted = 0

    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            for a_line, b_line in zip(committed_lines[i1:i2], working_lines[j1:j2]):
                if a_line == b_line:
                    result.append(b_line)
                else:
                    result.append(a_line)
                    reverted += 1
        elif op == "insert":
            result.extend(working_lines[j1:j2])
        elif op == "delete":
            pass
        elif op == "replace":
            result.extend(working_lines[j1:j2])

    return result, reverted


def process_file(path, rev, dry_run):
    try:
        committed = git_committed_lines(path, rev)
    except RuntimeError as exc:
        print("[saltado] {}: {}".format(path, exc), file=sys.stderr)
        return False

    with open(path, "r", encoding="utf-8") as fh:
        working = fh.readlines()

    working, reordered = reorder_measure_children(committed, working)
    cleaned, reverted = revert_cosmetic(committed, working)

    if cleaned == working and reordered == 0:
        print("{}: sin cambios cosmeticos que revertir".format(path))
        return False

    detalle = "{} linea(s)".format(reverted)
    if reordered:
        detalle += ", {} compas(es) reordenado(s)".format(reordered)

    if dry_run:
        print("{}: se revertirian {} (dry-run)".format(path, detalle))
        return True

    with open(path, "w", encoding="utf-8") as fh:
        fh.writelines(cleaned)
    print("{}: {} revertido(s)".format(path, detalle))
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
