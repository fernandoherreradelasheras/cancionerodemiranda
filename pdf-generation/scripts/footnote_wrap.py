"""Shared line-wrapping for the scholar edition's editorial footnotes.

The notes are injected into the score SVG as raw text (annotate_svg.py); neither
SVG <text>/<tspan> nor Verovio's <pgFoot> wraps running text, so we break the
lines ourselves. expand_annots.py reserves the vertical space (one <lb> per line)
*before* rendering and annotate_svg.py lays the text out *after*, so both passes
must agree on exactly where the breaks fall. That is why the width is a single
fixed characters-per-line and not a per-page measurement: the pre-render pass has
no SVG to measure, and a mismatch between the two passes would leave blank gaps or
overflow the page.

FONT_SIZE_PERCENT is the one knob for how big the notes are printed. Everything
else follows from it: expand_annots.py writes it into `@fontsize` of the <pgFoot>
<rend>, so each reserved <lb/> line is exactly as tall as a line of the text that
will be written into it; annotate_svg.py draws the text at the size verovio then
resolved, read back from the rendering; and the line width below scales with it.

CHARS_PER_LINE_AT_FULL_SIZE is sized to the printable column of the A4 page at
verovio's own page-footer size, and sits a little under the true fit so lines
never reach the right edge. Retune it only if the page geometry (size, margins)
changes -- the font size is already accounted for.
"""

# Percentage of verovio's default page-footer text size (100% = the size of the
# rest of the footer). The apparatus is meant to read as apparatus: small enough
# not to compete with the music and the lyrics, large enough to stay legible in
# print, and small enough that a long note costs few lines of page height.
FONT_SIZE_PERCENT = 75

CHARS_PER_LINE_AT_FULL_SIZE = 115

# Half the size, twice the characters: the column is a fixed width and the glyph
# advance scales with the font.
MAX_CHARS_PER_LINE = round(CHARS_PER_LINE_AT_FULL_SIZE * 100 / FONT_SIZE_PERCENT)


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
