#!/usr/bin/env python3
"""Check a book PDF against Amazon KDP's paperback interior requirements
before uploading, so the problems show up here and not in KDP's checker.

    kdp_preflight.py output/Cancionero_de_Miranda_Scholar_libro_without_facsimile_kdp.pdf

Checks: trim size (A4), page count within the color-interior limits, every
page's ink inside the inner/outer/top/bottom margins KDP requires for that
page count,
all fonts embedded, image resolution, no attachments or encryption.
Exit status 1 when something fails; warnings do not fail.

The limits are KDP's published ones at the time of writing and change now
and then: compare with KDP's "paperback manuscript" specification before
relying on a pass.
"""

import sys
import fitz

IN = 72.0
MM = IN / 25.4

A4 = (8.27, 11.69)
TRIM_TOLERANCE = 0.02  # inches

# Color interior, white paper, A4 (the three volumes print in color).
MIN_PAGES, MAX_PAGES = 24, 828

# Inner (gutter) margin by page count; outside, top and bottom margin
# without bleed.
GUTTER = [(150, 0.375), (300, 0.5), (500, 0.625), (700, 0.75), (828, 0.875)]
OUTER = 0.25

MIN_DPI = 300      # KDP warns below this
MIN_DPI_HARD = 150  # and we treat this as failing


def gutter_for(pages):
    for limit, inches in GUTTER:
        if pages <= limit:
            return inches
    return GUTTER[-1][1]


def ink_box(page):
    """Bounding box of everything drawn on the page: vector paths, text and
    images. Whitespace-only text (spaces, empty lines) is ignored."""
    box = fitz.Rect()
    for d in page.get_drawings():
        box |= d["rect"]
    for block in page.get_text("dict")["blocks"]:
        if block["type"] == 1:  # image
            box |= fitz.Rect(block["bbox"])
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                if span["text"].strip():
                    box |= fitz.Rect(span["bbox"])
    return box


def check(pdf_path):
    doc = fitz.open(pdf_path)
    failures, warnings = [], []
    n = doc.page_count
    print(f"{pdf_path}: {n} páginas")

    if doc.is_encrypted:
        failures.append("el PDF está cifrado")
    if doc.embfile_count():
        failures.append(f"{doc.embfile_count()} fichero(s) adjunto(s); KDP no los admite")

    if not MIN_PAGES <= n <= MAX_PAGES:
        failures.append(f"{n} páginas; KDP admite entre {MIN_PAGES} y {MAX_PAGES}")

    gutter = gutter_for(n) * IN
    outer = OUTER * IN
    print(f"  margen interior exigido: {gutter / IN:.3f} in, "
          f"exterior, superior e inferior: {OUTER} in")

    bad_size, bad_margin, low_res = [], [], []
    for i, page in enumerate(doc):
        num = i + 1
        w, h = page.rect.width / IN, page.rect.height / IN
        if abs(w - A4[0]) > TRIM_TOLERANCE or abs(h - A4[1]) > TRIM_TOLERANCE:
            bad_size.append((num, w, h))

        box = ink_box(page)
        if box.is_empty:
            continue
        # Odd pages are rectos: the gutter is on the left.
        left_min, right_min = (gutter, outer) if num % 2 else (outer, gutter)
        left = box.x0
        right = page.rect.width - box.x1
        top = box.y0
        bottom = page.rect.height - box.y1
        if (left < left_min - 0.5 or right < right_min - 0.5
                or top < outer - 0.5 or bottom < outer - 0.5):
            bad_margin.append((num, left / MM, right / MM, top / MM, bottom / MM,
                               left_min / MM, right_min / MM))

        for img in page.get_images(full=True):
            xref = img[0]
            info = doc.extract_image(xref)
            for rect in page.get_image_rects(xref):
                if rect.width <= 0:
                    continue
                dpi = info["width"] / (rect.width / IN)
                if dpi < MIN_DPI:
                    low_res.append((num, round(dpi)))

    if bad_size:
        failures.append(f"{len(bad_size)} página(s) fuera del tamaño A4, p. ej. "
                        + ", ".join(f"p. {p} ({w:.2f}x{h:.2f} in)" for p, w, h in bad_size[:5]))
    if bad_margin:
        failures.append(f"{len(bad_margin)} página(s) con tinta dentro del margen exigido:\n"
                        + "\n".join(f"      p. {p}: izq {l:.1f} mm, der {r:.1f} mm, "
                                    f"sup {t:.1f} mm, inf {b:.1f} mm "
                                    f"(mínimo {lm:.1f} / {rm:.1f} / {outer / MM:.1f})"
                                    for p, l, r, t, b, lm, rm in bad_margin[:15])
                        + ("\n      ..." if len(bad_margin) > 15 else ""))
    hard = [x for x in low_res if x[1] < MIN_DPI_HARD]
    if hard:
        failures.append(f"{len(hard)} imagen(es) por debajo de {MIN_DPI_HARD} dpi, p. ej. "
                        + ", ".join(f"p. {p} ({d} dpi)" for p, d in hard[:5]))
    elif low_res:
        warnings.append(f"{len(low_res)} imagen(es) por debajo de {MIN_DPI} dpi (KDP avisa, "
                        f"pero acepta), mínimo {min(d for _, d in low_res)} dpi")

    not_embedded = set()
    for page in doc:
        for f in page.get_fonts(full=True):
            # (xref, ext, type, basefont, name, encoding, referencer)
            if f[1] == "n/a" and f[2] not in ("Type3",):
                not_embedded.add(f[3])
    if not_embedded:
        failures.append("fuentes no incrustadas: " + ", ".join(sorted(not_embedded)))

    for w in warnings:
        print(f"  AVISO: {w}")
    for f in failures:
        print(f"  FALLO: {f}")
    if not failures:
        print("  KDP: sin problemas")
    return not failures


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.exit(0 if check(sys.argv[1]) else 1)
