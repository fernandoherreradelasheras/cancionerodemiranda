#!/usr/bin/env python3
"""Full-wrap paperback cover for Amazon KDP (back + spine + front, with bleed)
for one of the three print volumes, sized from the page count of the book PDF.

    python pdf-generation/build_cover.py output/Cancionero_de_Miranda_Scholar_libro_without_facsimile_kdp.pdf \\
        --edition scholar [--isbn 978-...]

Writes <book>_cover.pdf next to the book. The spine width is KDP's for color
interior on white paper (0.002347 in per page); rebuild the cover whenever the
page count changes. A blank white box is left at the lower right of the back
cover, where KDP prints the barcode itself.
"""

import argparse
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import fitz

BASE_DIR = Path(__file__).resolve().parent
LATEX_DIR = BASE_DIR / "latex"

# KDP paperback, A4 trim, color interior on white paper. Inches.
TRIM_W, TRIM_H = 8.27, 11.69
BLEED = 0.125
SPINE_PER_PAGE = 0.002347
SAFE = 0.25          # text no closer than this to the trim
SPINE_TEXT_MIN_PAGES = 79
BARCODE_W, BARCODE_H = 2.0, 1.2

EDITIONS = {
    "scholar": ("Edición crítica",
                "Edición crítica de los 77 tonos humanos del \\textit{Cancionero de "
                "Miranda}, con introducción, texto poético, aparato crítico y "
                "transcripción musical de cada tono."),
    "performer": ("Edición para intérpretes",
                  "Los 77 tonos humanos del \\textit{Cancionero de Miranda} en "
                  "transcripción moderna, con la introducción y el texto poético de "
                  "cada tono, preparados para el atril."),
    "facsimile": ("Facsímiles",
                  "Reproducción de los libretes manuscritos de los 77 tonos humanos "
                  "del \\textit{Cancionero de Miranda}, anexo a la edición crítica y a "
                  "la edición para intérpretes."),
}

SUBTITLE = ("Misçelanea de Tonos de varios autores a 4º do Pe. Dos. de Mirda "
            "da Costa Cappellão cantor da Cappella Real")


def cover_tex(pages, edition_label, blurb, isbn):
    spine = pages * SPINE_PER_PAGE
    width = 2 * BLEED + 2 * TRIM_W + spine
    height = TRIM_H + 2 * BLEED
    # x of the trim edges, from the left of the sheet
    back_l, back_r = BLEED, BLEED + TRIM_W
    front_l, front_r = back_r + spine, back_r + spine + TRIM_W
    spine_c = back_r + spine / 2
    # Spine text: KDP wants 0.0625in clear on each side of it.
    spine_text = ""
    if pages >= SPINE_TEXT_MIN_PAGES:
        size = max(6, min(18, (spine - 0.125) * 72 * 0.75))
        spine_text = (
            f"\\node[rotate=-90, text=iberianRed, font=\\fontsize{{{size:.1f}pt}}{{{size:.1f}pt}}\\selectfont\\scshape] "
            f"at ({spine_c}in, {height / 2}in) {{Cancionero de Miranda "
            f"\\textcolor{{iberianGold}}{{\\textmd{{\\textrm{{{edition_label}}}}}}}}};\n")
    isbn_line = f"ISBN {isbn}\\\\" if isbn else ""
    return rf"""\documentclass{{article}}
\usepackage[paperwidth={width:.4f}in,paperheight={height:.4f}in,margin=0in]{{geometry}}
\usepackage{{fontspec}}
\setmainfont{{TeX Gyre Termes}}
\usepackage{{xcolor}}
\usepackage{{graphicx}}
\usepackage{{tikz}}
\definecolor{{iberianRed}}{{HTML}}{{A50021}}
\definecolor{{iberianGold}}{{HTML}}{{896d00}}
\definecolor{{parchment}}{{HTML}}{{F4EEE1}}
\pagestyle{{empty}}
\parindent=0pt
\begin{{document}}
\begin{{tikzpicture}}[remember picture, overlay, shift={{(current page.south west)}}, x=1in, y=1in]
  % Full-bleed ground
  \fill[parchment] (0,0) rectangle ({width:.4f},{height:.4f});
  % Manuscript texture on the front, inside the trim as on the title page
  \node[anchor=south west, inner sep=0] at ({front_l + SAFE},{BLEED + SAFE})
    {{\includegraphics[width={TRIM_W - 2 * SAFE:.3f}in,height={TRIM_H - 2 * SAFE:.3f}in]{{manuscript_background.png}}}};
  % Spine
  \fill[iberianRed!8] ({back_r},0) rectangle ({front_l},{height:.4f});
  {spine_text}
  % Front cover text
  \node[anchor=north, text width={TRIM_W - 2 * SAFE - 0.5:.3f}in, align=center]
    at ({front_l + TRIM_W / 2},{height - BLEED - 2.2}) {{%
      {{\fontsize{{40}}{{46}}\selectfont\scshape\textcolor{{iberianRed}}{{Cancionero de Miranda}}\par}}
      \vspace{{0.6in}}
      {{\fontsize{{26}}{{30}}\selectfont\textcolor{{iberianGold}}{{{edition_label}}}\par}}
    }};
  \node[anchor=south, text width=4.8in, align=center]
    at ({front_l + TRIM_W / 2},{BLEED + SAFE + 1.0}) {{%
      {{\itshape\large {SUBTITLE}\par}}
      \vspace{{0.4in}}
      {{\textcolor{{iberianGold}}{{\small humanoydivino.com}}\par}}
    }};
  % Back cover
  \node[anchor=north west, text width={TRIM_W - 2 * SAFE - 0.5:.3f}in, align=justify]
    at ({back_l + SAFE + 0.25},{height - BLEED - SAFE - 1.0}) {{%
      {{\fontsize{{20}}{{24}}\selectfont\scshape\textcolor{{iberianRed}}{{Cancionero de Miranda}}\par}}
      \vspace{{0.15in}}
      {{\large\textcolor{{iberianGold}}{{{edition_label}}}\par}}
      \vspace{{0.5in}}
      {{\large {blurb}\par}}
      \vspace{{0.4in}}
      {{\large Edición de Fernando Herrera.\par}}
    }};
  \node[anchor=south west, text width={TRIM_W - 2 * SAFE - 0.5:.3f}in, align=left]
    at ({back_l + SAFE + 0.25},{BLEED + SAFE + BARCODE_H + 0.3}) {{%
      {{\small Publicado bajo licencia Creative Commons Atribución 4.0 (CC BY 4.0).\\
      Fuentes, partituras y audio: cdm.humanoydivino.com\\ {isbn_line}\par}}
    }};
  % Barcode area, left blank for KDP
  \fill[white] ({back_r - SAFE - BARCODE_W},{BLEED + SAFE}) rectangle ({back_r - SAFE},{BLEED + SAFE + BARCODE_H});
\end{{tikzpicture}}
\end{{document}}
"""


def build(book_pdf, edition, isbn, out=None):
    pages = fitz.open(book_pdf).page_count
    label, blurb = EDITIONS[edition]
    out = out or str(Path(book_pdf).with_name(Path(book_pdf).stem + "_cover.pdf"))
    spine = pages * SPINE_PER_PAGE
    print(f"{book_pdf}: {pages} páginas, lomo {spine:.3f} in ({spine * 25.4:.1f} mm)"
          + ("" if pages >= SPINE_TEXT_MIN_PAGES else "; lomo sin texto (menos de "
             f"{SPINE_TEXT_MIN_PAGES} páginas)"))

    tmp = tempfile.mkdtemp(prefix="cover-")
    (Path(tmp) / "cover.tex").write_text(cover_tex(pages, label, blurb, isbn))
    env = dict(os.environ, TEXINPUTS=f"{LATEX_DIR}//:" + os.environ.get("TEXINPUTS", ""))
    cmd = ["lualatex", "-interaction=nonstopmode", "-file-line-error",
           f"-output-directory={tmp}", f"{tmp}/cover.tex"]
    # Two runs: TikZ positions relative to `current page` come from the .aux
    # of the previous run.
    for _ in range(2):
        res = subprocess.run(cmd, capture_output=True, env=env)
    if res.returncode != 0:
        log = (Path(tmp) / "cover.log").read_text(errors="replace")
        errs = [l for l in log.splitlines() if l.startswith("!") or ".tex:" in l]
        raise SystemExit(f"lualatex falló ({tmp}/cover.log):\n" + "\n".join(errs[:10]))
    shutil.move(f"{tmp}/cover.pdf", out)
    shutil.rmtree(tmp, ignore_errors=True)

    r = fitz.open(out)[0].rect
    print(f"Portada generada: {out} ({r.width / 72:.3f} x {r.height / 72:.3f} in)")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("book_pdf")
    ap.add_argument("--edition", required=True, choices=list(EDITIONS))
    ap.add_argument("--isbn", default="")
    ap.add_argument("-o", "--output")
    a = ap.parse_args()
    build(a.book_pdf, a.edition, a.isbn, a.output)
