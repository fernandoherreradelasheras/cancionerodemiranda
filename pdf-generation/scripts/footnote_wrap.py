"""Shared line-wrapping for the scholar edition's editorial footnotes.

The notes are injected into the score SVG as raw text (annotate_svg.py); neither
SVG <text>/<tspan> nor Verovio's <pgFoot> wraps running text, so we break the
lines ourselves. expand_annots.py reserves the vertical space (one <lb> per line)
*before* rendering and annotate_svg.py lays the text out *after*, so both passes
must agree on exactly where the breaks fall. That is why the width is a single
fixed characters-per-line and not a per-page measurement: the pre-render pass has
no SVG to measure, and a mismatch between the two passes would leave blank gaps or
overflow the page.

MAX_CHARS_PER_LINE is sized to the printable column of the A4 page at the footnote
font size (the column fits ~90 average glyphs across the whole corpus); it sits a
little under that so lines never reach the right edge. Retune it only if the page
geometry (size, margins) or the footnote font size changes.
"""

MAX_CHARS_PER_LINE = 115


def wrap(text, cpl=MAX_CHARS_PER_LINE):
    """Greedy word-wrap `text` into lines of at most `cpl` characters. Whitespace
    (including the authored newlines in the source annot) is collapsed first; a
    single word longer than cpl is kept whole on its own line rather than split."""
    lines, current = [], ""
    for word in text.split():
        if not current:
            current = word
        elif len(current) + 1 + len(word) <= cpl:
            current += " " + word
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]
