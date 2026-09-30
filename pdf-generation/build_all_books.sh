#!/usr/bin/env bash
# Build every book of the Cancionero de Miranda:
#   - Scholar and Performer books with facsimiles (screen editions)
#   - Scholar and Performer books without facsimiles, KDP print layout
#   - Facsimile volume, KDP print layout
#   - the three KDP covers, sized from the page count of each KDP book
#
# ISBNs go on the credits page and the back cover; pass them in the
# environment: ISBN_SCHOLAR=978-... ISBN_PERFORMER=978-... ISBN_FACSIMILE=978-...
# Any extra arguments are passed through to generate-pdfs.py (e.g. --skip-doctor,
# or a tono number to build only the first N tonos as a test).

set -euo pipefail

cd "$(dirname "$0")/.."
GEN="python pdf-generation/generate-pdfs.py"
COVER="python pdf-generation/build_cover.py"
OUT=output/Cancionero_de_Miranda

echo "### Scholar book with facsimiles"
$GEN "$@" --book scholar
echo "### Performer book with facsimiles"
$GEN "$@" --book performer

echo "### Scholar book without facsimiles (KDP)"
$GEN "$@" --book scholar --without-facsimile --kdp --isbn "${ISBN_SCHOLAR:-}"
echo "### Performer book without facsimiles (KDP)"
$GEN "$@" --book performer --without-facsimile --kdp --isbn "${ISBN_PERFORMER:-}"
echo "### Facsimile book (KDP)"
$GEN "$@" --book facsimile --kdp --isbn "${ISBN_FACSIMILE:-}"

echo "### KDP covers"
$COVER "${OUT}_Scholar_libro_without_facsimile_kdp.pdf"   --edition scholar   --isbn "${ISBN_SCHOLAR:-}"
$COVER "${OUT}_Performer_libro_without_facsimile_kdp.pdf" --edition performer --isbn "${ISBN_PERFORMER:-}"
$COVER "${OUT}_Facsimiles_kdp.pdf"                        --edition facsimile --isbn "${ISBN_FACSIMILE:-}"

echo
echo "Listo:"
ls -1 "${OUT}"_*libro*.pdf "${OUT}"_Facsimiles*.pdf
