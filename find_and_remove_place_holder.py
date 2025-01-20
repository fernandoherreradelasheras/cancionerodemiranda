import fitz
import sys
import os

doc = fitz.open(sys.argv[1])
search_term = "{{ TEXT PLACEHOLDER }}"
for idx,page in enumerate(doc):
    found = page.search_for(search_term)
    if len(found) == 1:
        page.add_redact_annot(found[0], '')  # Remove the placeholder text
        page.apply_redactions()  # apply the redaction now
        # convert the position from pdf units to cms
        offset = 0.0352778 * found[0].bl.y
        print(f'{idx+1}:{offset}:{len(doc)}')

doc.save("tmp-pdf.pdf")
os.rename("tmp-pdf.pdf", sys.argv[1])
