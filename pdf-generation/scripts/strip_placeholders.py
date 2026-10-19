"""
strip_placeholders.py

Quita de una introducción los marcadores de trabajo antes de publicarla. Las fuentes
(tonos/NN/*-intro.md) los conservan como notas para los editores; la web, sus páginas
estáticas y los PDF muestran solo texto terminado.

Mismas reglas que web-app/scripts/strip-placeholders.mjs (web-app/scripts/
strip-placeholders.test.mjs comprueba que ambos coinciden en todas las introducciones):

  *[TODO: …]*   párrafo propio, quizá de varias líneas: se quita entero
  TODO: …       hasta el final de la línea, solo o tras otro texto (una nota al pie)

Después se quitan los encabezados que se quedan sin nada debajo, y los padres cuyas
subsecciones se han ido todas.

Uso:
    python strip_placeholders.py IN.md [OUT.md] [--mei TONO.mei]

Con --mei, añade además la advertencia del alto reconstruido si hace falta.
"""

import re
import sys

BRACKETED = re.compile(r"\*\[TODO[\s\S]*?\]\*")
PLAIN = re.compile(r"[ \t]*\bTODO:[^\n]*")
HEADING = re.compile(r"^(#{1,6})\s")


def _level(line):
    m = HEADING.match(line)
    return len(m.group(1)) if m else 0


def _drop_empty_headings(lines):
    while True:
        keep = [True] * len(lines)
        changed = False
        for i, line in enumerate(lines):
            level = _level(line)
            if not level:
                continue
            j = i + 1
            while j < len(lines) and lines[j].strip() == "":
                j += 1
            nxt = _level(lines[j]) if j < len(lines) else -1
            if nxt == -1 or 0 < nxt <= level:
                keep[i] = False
                changed = True
        lines = [line for line, k in zip(lines, keep) if k]
        if not changed:
            return lines


def strip_placeholders(md):
    text = PLAIN.sub("", BRACKETED.sub("", md))
    # Las líneas que quedan en blanco pierden los espacios; las demás los conservan
    # (dos espacios al final son un salto de línea en Markdown)
    lines = _drop_empty_headings(["" if l.strip() == "" else l for l in text.split("\n")])
    out = "\n".join(lines)
    out = re.sub(r"\n{3,}", "\n\n", out)
    return out.lstrip("\n").rstrip("\n") + "\n"


RECONSTRUCTED = re.compile(r'<perfRes\b[^>]*\bsource="#(?:alto|guion)-(?:part-)?recomposition"[^>]*>([^<]*)</perfRes>')


def reconstructed_voices(mei):
    """Las voces que escribe la edición, por su etiqueta: el alto reconstruido (@source
    #alto-part-recomposition: "Alto", "Alto 2º"…) y el guion que la fuente no trae
    (@source #guion-recomposition)."""
    return [m.strip() for m in RECONSTRUCTED.findall(mei)]


def _mentions_reconstruction(md):
    return any(re.search(r"reconstru", p, re.I) and re.search(r"\balto\b", p, re.I)
               for p in re.split(r"\n\s*\n", md))


def alto_notice(voices):
    alto = next((v for v in voices if re.match(r"alto", v, re.I)), None)
    if not alto:
        return None
    name = f"del {alto.lower()}"
    if any(re.match(r"guion", v, re.I) for v in voices):
        return (f"Tanto la voz {name}, cuyo librete está perdido, como el guion, que la fuente no trae "
                "para este tono, son reconstrucción editorial.")
    return f"La voz {name}, cuyo librete está perdido, es reconstrucción editorial."


def with_alto_notice(md, voices):
    """Todo tono cuyo alto es reconstrucción tiene que decirlo en su introducción
    (CLAUDE.md). Mientras el párrafo que lo explica sea un marcador, el texto publicado
    lleva la frase estándar, la primera de "La edición" (que se crea si el filtro la quitó)."""
    notice = alto_notice(voices)
    if not notice or _mentions_reconstruction(md):
        return md
    heading = re.compile(r"^## La edición[ \t]*$", re.M)
    if heading.search(md):
        return heading.sub(lambda m: f"{m.group(0)}\n\n{notice}", md, count=1)
    return md.rstrip("\n") + f"\n\n## La edición\n\n{notice}\n"


if __name__ == "__main__":
    args = sys.argv[1:]
    mei = None
    if "--mei" in args:
        i = args.index("--mei")
        mei = args[i + 1]
        del args[i:i + 2]
    if len(args) not in (1, 2):
        sys.exit(__doc__)
    with open(args[0], encoding="utf-8") as f:
        result = strip_placeholders(f.read())
    if mei:
        with open(mei, encoding="utf-8") as f:
            result = with_alto_notice(result, reconstructed_voices(f.read()))
    if len(args) == 2:
        with open(args[1], "w", encoding="utf-8") as f:
            f.write(result)
    else:
        sys.stdout.write(result)
