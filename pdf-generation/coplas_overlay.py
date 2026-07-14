"""Isolated "coplas overlay" (scholar edition).

After the single-verse score is rendered to PDF, the remaining stanzas need to
appear laid out over the last score page, where a placeholder marker was
reserved (see the placeholder injected into the MEI before rendering). This
module keeps that whole trick behind one boundary: the pipeline passes the
overlay groups (section -> its Stanza objects, from poem_from_mei.overlay_groups)
and calls `overlay_extra_text(...)`. Inside live PyMuPDF (find + redact the
marker, and stamp the stanzas onto the score page) and a standalone `paracol`
LaTeX document. The first stanza of each section is sung on the score, so only
the rest are overlaid.

The pipeline injects its own `render_latex` callable so this module stays free
of the rest of the build's configuration.
"""

import math
import shutil
from pathlib import Path

import fitz
from pylatex.utils import escape_latex


# --- Overlay content from the parsed poem -----------------------------------

def overlaid(stanzas):
    """The stanzas actually overlaid on the score: all but the first (which is
    the sung single-verse)."""
    return stanzas[1:]


def placeholder_metrics(overlaid_stanzas):
    """(lines, stanzas) fed to estimate_placeholder_lines. Reproduces the legacy
    heuristic's magnitudes: `lines` is the overlaid verse count minus a small
    fixed slack the old string-counting subtracted."""
    return sum(len(s.lines) for s in overlaid_stanzas) - 3, len(overlaid_stanzas)


def estimate_placeholder_lines(lines, stanzas):
    """Blank lines to reserve on the score page for the coplas that will be
    overlaid. Empirical heuristic assuming a 3-column layout: roughly one
    stanza's height, plus the tallest column's overflow, plus per-stanza slack.
    """
    cols = 3
    stanza_size = lines / stanzas
    return int(stanza_size + (lines - 1) / stanza_size / cols * stanza_size + 3 * stanzas)


# --- PDF placeholder handling + overlay -------------------------------------

def find_and_remove_place_holder(section, pdf, tmp_dir):
    """Locate the `{{ %% section %% }}` marker in the rendered score, redact it,
    and return (1-based page number, vertical offset in cm, total pages)."""
    shutil.copy(pdf, f"{tmp_dir}/tmp-pdf-with-placeholder-{section}.pdf")

    page_with_placeholder = -1
    offset = -1

    doc = fitz.open(pdf)
    search_term = f'{{{{ %% {section} %% }}}}'
    for idx, page in enumerate(doc):
        found = page.search_for(search_term)
        if len(found) == 1:
            page.add_redact_annot(found[0], '')  # Remove the placeholder text
            page.apply_redactions()  # apply the redaction now
            # convert the position from pdf units to cms
            offset = 0.0352778 * found[0].bl.y
            page_with_placeholder = idx + 1

    doc.save(f"{tmp_dir}/tmp-pdf-with-placeholder-hidden-{section}.pdf")
    shutil.copy(f"{tmp_dir}/tmp-pdf-with-placeholder-hidden-{section}.pdf", pdf)

    return (page_with_placeholder, offset, len(doc))


def build_verses_overlay(offset, stanzas, section):
    """Standalone LaTeX (memoir + paracol, 3 columns) rendering the stanzas,
    top margin = the offset where the placeholder was, so it lands in place.
    Each stanza is labelled with its own copla number (Stanza.number, the
    authored @n) — cumulative across the poem, so re-voiced sections (tono 58)
    keep the real copla numbers instead of restarting. The verse width per
    stanza uses the longest verse seen so far (cumulative, matching the original)."""
    print(f"Building overlay for section {section}")

    longest_so_far = ""
    longest = []
    for stanza in stanzas:
        for verse in stanza.lines:
            if len(verse) > len(longest_so_far):
                longest_so_far = verse
        longest.append(longest_so_far)

    colbreak = len(stanzas) // 3 if len(stanzas) > 3 else 1

    out = []

    def line(s):
        out.append(s + "\n")

    line('\\documentclass[a4paper]{memoir}')
    line('\\usepackage{paracol}')
    line('\\usepackage{iftex}')
    line('\\ifpdftex\\usepackage[utf8]{inputenc}\\usepackage[T1]{fontenc}'
         '\\else\\usepackage{fontspec}\\setmainfont{TeX Gyre Termes}\\fi')
    line('\\usepackage[layout=a4paper,top=%dcm,bottom=1cm,left=0.25cm,right=0.25cm]{geometry}'
         % math.floor(offset))
    line('\\pagenumbering{gobble}')
    line('\\begin{document}')
    line('\\begin{paracol}{3}')

    for stanza_idx, stanza in enumerate(stanzas):
        if colbreak > 0 and stanza_idx > 0 and stanza_idx % colbreak == 0:
            line('\\switchcolumn')

        number = stanza.number if stanza.number is not None else stanza_idx + 2
        line('\\settowidth{\\versewidth}{%s}' % longest[stanza_idx])
        line('\\begin{verse}')
        for verse_idx, verse in enumerate(stanza.lines):
            if verse_idx == 0:
                line('\\textbf{%d.}\\\\' % number)
            line('%s\\\\' % escape_latex(verse))
        line('\\end{verse}')

    line('\\end{paracol}')
    line('\\end{document}')
    return "".join(out)


def overlay_stanzas_on_page(music_pdf, stanzas_pdf, page_number):
    """Stamp the single-page stanzas PDF as the background of the given (1-based)
    score page, in place. Replaces the pdftk extract/background/reassemble dance
    with one PyMuPDF operation: both pages are A4, so mapping the stanzas page
    onto the score page's rect drops the text at the reserved position."""
    music = fitz.open(music_pdf)
    stanzas = fitz.open(stanzas_pdf)
    target = music[page_number - 1]
    target.show_pdf_page(target.rect, stanzas, 0, overlay=False)
    stanzas.close()
    out = music_pdf + ".overlaid"
    music.save(out, garbage=3, deflate=True)
    music.close()
    shutil.move(out, music_pdf)


def overlay_extra_text(groups, music_pdf, tmp_dir, render_latex):
    """For each overlay group (section, stanzas), redact its placeholder on the
    score and overlay the remaining stanzas at that spot. `render_latex(dir,
    file)` is provided by the pipeline."""
    for section, stanzas in groups:
        rest = overlaid(stanzas)
        if not rest:
            continue

        injected_section = f"{section}_extra_text"
        (page, offset, pages) = find_and_remove_place_holder(injected_section, music_pdf, tmp_dir)
        if page < 0:
            print(f'Cannot find placeholder for section {section} on the rendered pdf. Skipping text injection')
            continue

        texname = f"stanzas_{section}.tex"
        outputname = f"stanzas_{section}.pdf"
        latexStr = build_verses_overlay(offset, rest, section)
        (Path(tmp_dir) / texname).write_text(latexStr)
        render_latex(tmp_dir, texname)

        overlay_stanzas_on_page(music_pdf, f"{tmp_dir}/{outputname}", page)
