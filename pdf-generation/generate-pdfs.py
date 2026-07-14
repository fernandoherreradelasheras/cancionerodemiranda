#!/usr/bin/env python3

import os
import sys
import json
import argparse
import hashlib
import glob
import tempfile
import subprocess
import shutil
import re
import fitz
import unicodedata
import contextlib
import multiprocessing
from concurrent.futures import ProcessPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path
from lxml import etree as ET
from copy import deepcopy
from dataclasses import dataclass
from enum import StrEnum, auto
from pylatex.utils import escape_latex

import coplas_overlay as overlay
import poem_from_mei

class EditionType(StrEnum):
    PERFORMER = auto()
    SCHOLAR = auto()


# Constants
MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {"mei" : MEI_NS}
MUSE = "MuseScore-Studio.AppImage"
PRE_RELEASE = 1
BASE_URL = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/tonos"
# Default LaTeX engine. LuaLaTeX (UTF-8 native, fontspec/unicode-math) replaces
# pdflatex; the preambles stay engine-aware via iftex, so --engine pdflatex still
# works as a fallback.
LATEX_RENDERED = "lualatex"
FACSIMILE_RESIZE = "50"
# How many LaTeX error blocks to surface before truncating (see parse_latex_log)
MAX_LATEX_ERRORS = 8

# Repository layout. This script lives in pdf-generation/, with its LaTeX, XSLT
# and helper-script assets alongside it. Data (tonos/, output/, facsimil-images/)
# and the shared scripts/ dir are still resolved relative to the repo root, i.e.
# the CWD the pipeline must be run from (`python pdf-generation/generate-pdfs.py`).
BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
LATEX_DIR = BASE_DIR / "latex"
XSLT_DIR = BASE_DIR / "xslt"
PIPELINE_SCRIPTS_DIR = BASE_DIR / "scripts"

# Verovio engraving options, fixed for the whole cancionero (unit and scale are
# per-tono). Reference: https://book.verovio.org/toolkit-reference/toolkit-options.html
VEROVIO_OPTIONS = {
    "multi-rest-style": "auto",
    "mnum-interval": "0",
    "page-margin-left": "150",
    "page-margin-right": "150",
    "page-margin-top": "50",
    "page-margin-bottom": "50",
    "bottom-margin-header": "8",   # a stray duplicate '2.5' used to precede (and be overridden by) this
    "top-margin-pg-footer": "4",
    "lyric-height-factor": "1.2",
    "lyric-top-min-margin": "2.5",
    "lyric-line-thickness": "0.2",
    "header": "auto",
    "footer": "encoded",
    "breaks": "smart",
    "breaks-smart-sb": "0.02",
    "condense": "none",
    "min-last-justification": "0.2",
    "svg-additional-attribute": "rend@type",
}
# Value-less verovio flags.
VEROVIO_FLAGS = ["--mdiv-all", "-a", "--mm-output", "--no-justification",
                 "--scale-to-page-size", "--justify-vertically"]

# Incremental builds: manifest file and the shared assets whose contents affect
# every tono's output (a change to any of them invalidates all cached builds).
BUILD_MANIFEST = "output/.build-manifest.json"
SHARED_ASSETS = [
    "pdf-generation/generate-pdfs.py", "pdf-generation/coplas_overlay.py",
    "pdf-generation/poem_from_mei.py", "tonos/index.json",
    "pdf-generation/latex/header.tex", "pdf-generation/latex/iberianpolyphony.sty",
    "pdf-generation/latex/acerca.tex",
    "pdf-generation/latex/criterios-musicales-performer.tex",
    "pdf-generation/latex/criterios-musicales-scholar.tex",
    "pdf-generation/xslt/pgHead.xsl", "pdf-generation/xslt/coplas-placeholder.xsl",
    "pdf-generation/scripts/extract_comments_from_mei.py",
    "pdf-generation/scripts/expand_annots.py",
    "pdf-generation/scripts/annotate_svg.py", "scripts/normalize_ficta.py",
]

# Dependencies checked by --doctor / the preflight (see run_doctor).
# XSLT runs in-process via lxml/libxslt; PDF page overlay + MEI embedding use
# PyMuPDF — so neither xsltproc/java/Saxon nor pdftk are needed.
REQUIRED_TOOLS = ["verovio", "svgs2pdf", LATEX_RENDERED, "pandoc",
                  "magick", "git"]
REQUIRED_PYTHON = ["lxml", "fitz", "pylatex"]

@dataclass
class Config:
    """Run-scoped configuration, populated in main(). Groups what used to be
    scattered module globals so functions read a single source of truth."""
    tmp_dir: str = ""
    debug: bool = True
    latex_engine: str = LATEX_RENDERED
    facsimile_resize: str = FACSIMILE_RESIZE
    pre_release: bool = bool(PRE_RELEASE)
    base_url: str = BASE_URL

    @property
    def debug_log(self):
        return os.path.join(self.tmp_dir, "debug.log") if self.tmp_dir else None


CONFIG = Config()


class CommandError(Exception):
    """An external command exited with a non-zero status."""
    def __init__(self, cmd, returncode, output):
        self.cmd = cmd if isinstance(cmd, str) else " ".join(str(c) for c in cmd)
        self.returncode = returncode
        self.output = output or ""
        tail = "\n".join(self.output.strip().splitlines()[-15:])
        super().__init__(f"Command failed (exit {returncode}): {self.cmd}"
                         + (f"\n{tail}" if tail else ""))


class LatexError(Exception):
    """A LaTeX run failed; carries the parsed, human-readable error excerpt."""
    def __init__(self, tex_file, log_path, errors, returncode):
        self.tex_file = tex_file
        self.log_path = log_path
        self.errors = errors
        self.returncode = returncode
        if errors:
            detail = "\n\n".join(errors[:MAX_LATEX_ERRORS])
            if len(errors) > MAX_LATEX_ERRORS:
                detail += f"\n\n... y {len(errors) - MAX_LATEX_ERRORS} error(es) más"
        else:
            detail = "(no se identificaron líneas de error; revisar el log completo)"
        super().__init__(f"LaTeX falló en {tex_file} (exit {returncode}). "
                         f"Log completo: {log_path}\n{detail}")


def parse_latex_log(log_path):
    """Extract the meaningful error blocks from a (huge) LaTeX .log file.

    Relies on pdflatex being run with -file-line-error, so errors appear as
    './file.tex:NN: message' or as '! message', each followed by a few lines of
    context up to the 'l.NN ...' source line.
    """
    p = Path(log_path)
    if not p.exists():
        return []
    lines = p.read_text(errors="replace").splitlines()
    errors = []
    i, n = 0, len(lines)
    while i < n:
        line = lines[i]
        is_error = line.startswith('! ') or re.match(r'^\.?/?.+?\.\w+:\d+: ', line)
        if is_error:
            block = [line.rstrip()]
            j = i + 1
            while j < n and (j - i) <= 6:
                block.append(lines[j].rstrip())
                if lines[j].startswith('l.'):
                    break
                j += 1
            errors.append("\n".join(b for b in block if b))
            i = j + 1
        else:
            i += 1
    return errors

ET.register_namespace("mei", MEI_NS)


def log(message):
    """Append a message to the run's debug.log (no-op until CONFIG.tmp_dir set)."""
    path = CONFIG.debug_log
    if path:
        with open(path, "a") as f:
            f.write(f"{message}\n")


# Currently verovio has a bug that results on overflowing page
# contents when you have two consecutive div elements.
def workaround_verovio_2divs_bug(mei_file):
    tree = ET.parse(mei_file)
    root = tree.getroot()
    divs = root.xpath('//mei:section/mei:div', namespaces=NSMAP)

    for div in divs:
        parent = div.getparent()
        parentPrev = parent.getprevious()
        parentPrevChild = parentPrev.getchildren()[0]
        if parentPrev.tag == f"{{{MEI_NS}}}section" and parentPrevChild.tag == f"{{{MEI_NS}}}div":
            child = div.getchildren()[0]
            parentPrevChild.append(deepcopy(child))
            parent.getparent().remove(parent)

    f = open(mei_file, 'wb')
    f.write(ET.tostring(root, pretty_print=True,  encoding="utf-8"))
    f.close()


def get_entries_from_mei(mei_file):
    tree = ET.parse(mei_file)
    root = tree.getroot()
    composerNode = root.xpath('//mei:composer/mei:persName', namespaces=NSMAP)
    lyricistNode = root.xpath('//mei:lyricist/mei:persName', namespaces=NSMAP)

    composer = composerNode[0].text if len(composerNode) > 0 else "Anónimo"
    lyricist = lyricistNode[0].text if len(lyricistNode) > 0 else "Anónimo"

    return composer, lyricist




class Latex:
    """Tiny accumulator for building LaTeX source, so the code reads as a
    sequence of statements instead of `str = str + ...` soup."""

    def __init__(self):
        self._parts = []

    def raw(self, text):
        """Append text verbatim (the caller controls its newlines)."""
        self._parts.append(text)
        return self

    def line(self, text=""):
        self._parts.append(text + "\n")
        return self

    def section(self, title, centered=True):
        body = f"\\centering\\LARGE{{{title}}}" if centered else title
        return self.line(f"\\section*{{{body}}}")

    def subsection(self, title):
        return self.line(f"\\subsection*{{{title}}}")

    def input(self, name):
        return self.line(f"\\input{{{name}}}")

    def __str__(self):
        return "".join(self._parts)


def add_image(directory, file, caption, title=None):
    """Generate LaTeX code for including an image"""

    orig_path = f'{directory}/{file}'
    resize = CONFIG.facsimile_resize
    resized_path = orig_path if resize == "100" else f'{orig_path}_{resize}.jpg'
    path = Path(resized_path)
    if not path.is_file():
        print(f'Resizing image {orig_path} {resize}%')
        resize_cmd = [ 'magick', orig_path, '-resize', f'{resize}%', resized_path]
        run(resize_cmd)

    lines = ["\\begin{figure}[p]"]

    if title:
        lines.append(f"\\section*{{\\centering\\LARGE{{{title}}}}}")

    lines.extend([
        f"\\caption{{{caption}}}",
        "\\makebox[\\linewidth]{",
        f"\\includegraphics[width=0.95\\linewidth]{{{resized_path}}}",
        "}",
        "\\end{figure}"
    ])
    return "\n".join(lines)

def format_titles(n, title, music, text):
    """Generate title definitions"""
    ordinal = f"{int(n)}º"
    return (f"\\def\\mytitle{{\\centering \\LARGE Tono {ordinal}: {title} \\\\}}\n"
            f"\\def\\mymusic{{{music}}}\n"
            f"\\def\\mytext{{{text}}}\n")

def get_version_from_git(files):
    """Get version based on git revision count"""
    try:
        cmd = ["git", "rev-list", "--count", "main", "--"] + files
        rev_count = subprocess.check_output(cmd).decode().strip()
        return rev_count
    except subprocess.CalledProcessError:
        return 0


def _cmd_str(cmd):
    return cmd if isinstance(cmd, str) else " ".join(str(c) for c in cmd)


def render_latex(dir, file):
    # nonstopmode + file-line-error give parseable diagnostics; batchmode hid them.
    # Don't decode stdout: pdflatex echoes source bytes that aren't valid UTF-8;
    # diagnostics are read from the .log (with errors="replace") instead.
    cmd = [CONFIG.latex_engine, "-interaction=nonstopmode", "-file-line-error",
           f"-output-directory={dir}", f"{dir}/{file}"]
    # The shared preamble (header.tex, iberianpolyphony.sty, acerca.tex,
    # criterios-*.tex, manuscript_background.png) lives in pdf-generation/latex/,
    # while values.tex is written into the output dir; TEXINPUTS lets kpathsea
    # find both by basename (trailing '//' = recurse, trailing ':' = defaults).
    env = dict(os.environ)
    env["TEXINPUTS"] = f"{LATEX_DIR}//:" + env.get("TEXINPUTS", "")
    log(f"$ {_cmd_str(cmd)}")
    result = subprocess.run(cmd, capture_output=True, env=env)
    if result.returncode != 0:
        log_path = os.path.join(dir, Path(file).stem + ".log")
        raise LatexError(file, log_path, parse_latex_log(log_path), result.returncode)


def run(cmd, cwd=None, input_text=None):
    # Single command runner: always a list/str of args, captures both streams,
    # logs the invocation and its output to debug.log, decodes leniently
    # (some tools emit non-UTF-8), and raises a uniform CommandError on failure.
    # input_text, if given, is fed to the command's stdin (e.g. pandoc).
    log(f"$ {_cmd_str(cmd)}")
    result = subprocess.run(cmd, capture_output=True, cwd=cwd,
                            input=input_text.encode() if input_text is not None else None)
    out = (result.stdout or b"").decode("utf-8", "replace")
    err = (result.stderr or b"").decode("utf-8", "replace")
    if out:
        log(out)
    if err:
        log(err)
    if result.returncode != 0:
        raise CommandError(cmd, result.returncode, out + err)
    out = out.strip()
    if out:
        print(out)
    return out



def format_version(version):
    return f"\\def\\myversion{{0.{version}}}\n"

def format_edition(buildType):
    if buildType == EditionType.PERFORMER:
        return  "\\def\\myedition{Edición para intérpretes}\n"
    elif buildType == EditionType.SCHOLAR:
        return  "\\def\\myedition{Edición musicológica}\n"


def format_status(data):
    status_text = data['status_text']
    status_music = data['status_music']
    out = (f"\\def\\mystatustext{{{status_text}}}\n"
           f"\\def\\mystatusmusic{{{status_music}}}\n")
    # Stamp a "draft" watermark unless both text and music are completed.
    if any(s != "completed" for s in (status_text, status_music)):
        out += "\\DraftwatermarkOptions{stamp=true}\n"
    return out


def get_facsimil(items):
    return "".join(add_image("facsimil-images", item['file'], item['name']) for item in items)


def format_init():
    return ("\\documentclass[12pt, a4paper, twoside,hidelinks]{article}\n"
            "\\usepackage{iberianpolyphony}\n"
            "\\addcovermanuscriptbackground\n"
            "\\input{header.tex}\n"
            "\\begin{document}\n"
            "\\customtitlepage{\\mytitle}\n")


def render_stanzas_tex(stanzas):
    """A block's stanzas as verse lines (blank line -> '!' between stanzas)."""
    result = []
    for i, stanza in enumerate(stanzas):
        if i > 0:
            result.append('!')
        for verse in stanza.lines:
            result.append(" ")
            result.append(f"{escape_latex(verse.strip())} \\\\")
    return "\n".join(result)


def notes_to_markdown(notes):
    """Format the poem's text notes as markdown for pandoc: `**N** text`, one per
    line joined by a hard break; a note with no number (source-wide) is bare.
    Returns None when there are no notes."""
    if not notes:
        return None

    def line(display, text):
        if display is None:
            return text
        sep = '' if text.startswith(':') else ' '   # reproduce **N**: vs **N** ...
        return f'**{display}**{sep}{text}'

    return '\\\n'.join(line(d, t) for d, t in notes) + '\n'


def format_text_part(poem, out_dir):
    tex = Latex()
    tex.section("Texto poético")
    tex.raw("\\begingroup\n\\centering\n\\Large\n\\itshape\n"
            "\\settowidth{\\versewidth}{xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx}\n"
            "\\setlength{\\vrightskip}{-3em}\n"
            "\\begin{verse}[\\versewidth]\n\\poemlines{5}\n")

    print('Building LaTeX code for the text edition')
    blocks = poem.blocks if poem else []
    for block in blocks:
        # Add a heading only when there is more than one section.
        if len(blocks) > 1:
            tex.line(f"\\flagverse{{\\textnormal{{{block.heading}}}}}")
        tex.raw(render_stanzas_tex(block.stanzas))

    tex.line("\\poemlines{0}").line("\\end{verse}").line("\\endgroup")

    comments_md = notes_to_markdown(poem.notes if poem else [])
    if comments_md:
        out = f'{out_dir}/text_comments.tex'
        run(['pandoc', '-o', out], input_text=comments_md)
        tex.subsection("Notas al texto poético").line("\\noindent").input(out)

    return str(tex)


def generate_audio_link(data, buildType):
    if 'audioBaseFile' not in data:
        return ''

    url = f"{CONFIG.base_url}/{data['path']}/{data['audioBaseFile']}"

    tex = Latex()
    tex.subsection("Recursos online").line("\\noindent")
    tex.line("Interpretación de audio generada por software disponible en:").line()
    tex.line("\\begin{center}")
    tex.line("\\setlength{\\fboxsep}{10pt}")
    tex.line(f"\\fbox{{\\hypersetup{{urlcolor=black}}{{\\qrcode[hyperlink,height=2.5cm]{{{url}}}}}}}")
    tex.line("\\end{center}")
    return str(tex)



def generate_music_comments_from_mei_file(mei_file, json_params, out_dir, buildType):
    annotations =  "--extractAnnotations" if buildType is EditionType.PERFORMER else "--noExpandAnnotations"
    out = f'{out_dir}/music_comments.tex'
    run(['python', str(PIPELINE_SCRIPTS_DIR / 'extract_comments_from_mei.py'), mei_file, json_params, annotations, out])
    return f"\\input{{{out}}}\n"


def write_mei(tree, path):
    """Serialize an lxml tree back to an MEI file (replaces xmlstarlet ed -L)."""
    tree.write(path, pretty_print=True, encoding="utf-8", xml_declaration=True)


def write_pretty_mei(src, dst):
    """Copy a MEI to dst with uniform indentation. The pgHead XSLT emits the
    injected fileDesc unindented (crammed onto single lines); re-indent the whole
    tree so the output/embedded MEI is readable. Only whitespace-only text nodes
    are touched, so significant spaces (e.g. <rend> </rend>) are preserved."""
    tree = ET.parse(src)
    ET.indent(tree, space="   ")
    tree.write(dst, pretty_print=True, encoding="utf-8", xml_declaration=True)


def apply_xslt(tree, xsl_path, **params):
    """Run an XSLT 1.0 stylesheet in-process with libxslt (via lxml) instead of
    shelling out to xsltproc/Saxon. Params are passed as strings."""
    transform = ET.XSLT(ET.parse(xsl_path))
    result = transform(tree, **{k: ET.XSLT.strparam(str(v)) for k, v in params.items()})
    if transform.error_log:
        for entry in transform.error_log:
            log(f"[xslt {xsl_path}] {entry.message}")
    return result


def append_empty_section_after(mei_file, after_label, new_label):
    """Insert an empty <section label="new_label"/> right after the section
    labelled after_label (later filled by coplas-placeholder.xsl)."""
    tree = ET.parse(mei_file)
    matches = tree.getroot().xpath(f'//mei:section[@label="{after_label}"]', namespaces=NSMAP)
    if not matches:
        return
    matches[0].addnext(ET.Element(f'{{{MEI_NS}}}section', label=new_label))
    write_mei(tree, mei_file)


def delete_extra_verses(mei_file):
    """Keep only the first verse of every part (drops <verse n!="1">)."""
    tree = ET.parse(mei_file)
    for verse in tree.getroot().xpath('//mei:verse[@n!="1"]', namespaces=NSMAP):
        verse.getparent().remove(verse)
    write_mei(tree, mei_file)



def insert_title_in_mei(mei_file, section, title):
    title = title.replace('_', ' ').capitalize()

    print(f"Injecting {section} heading {title} into the mei score")

    tree = ET.parse(mei_file)
    measures = tree.getroot().xpath(f'//mei:section[@label="{section}"]/mei:measure[1]',
                                    namespaces=NSMAP)
    if not measures:
        print(f"  no measure found for section '{section}'; skipping title")
        return

    dir_el = ET.SubElement(measures[0], f'{{{MEI_NS}}}dir',
                           place="above", staff="1", tstamp="0")
    rend_el = ET.SubElement(dir_el, f'{{{MEI_NS}}}rend',
                            fontsize="large", fontweight="bold")
    rend_el.text = title
    write_mei(tree, mei_file)

def inject_section_place_holders(mei_file, groups):
    """Reserve vertical space in the MEI for the coplas that will later be
    overlaid on the score (see coplas_overlay.overlay_extra_text). `groups` is
    [(section, [Stanza])] from poem_from_mei.overlay_groups."""
    for section, stanzas in groups:
        overlaid = overlay.overlaid(stanzas)
        if not overlaid:
            print(f'section {section} has no verses to append, skipping')
            continue

        lines, n_stanzas = overlay.placeholder_metrics(overlaid)
        printed_lines = overlay.estimate_placeholder_lines(lines, n_stanzas)
        print("Injecting placeholder for printed lines: %d" % printed_lines)

        injected_section = f"{section}_extra_text"
        append_empty_section_after(mei_file, section, injected_section)

        result = apply_xslt(ET.parse(mei_file), str(XSLT_DIR / 'coplas-placeholder.xsl'),
                            section=injected_section, lines=printed_lines)
        result.write(mei_file, encoding="utf-8", xml_declaration=True)


def _persname(root, xpath, default="[Anónimo]"):
    n = root.xpath(xpath, namespaces=NSMAP)
    return n[0].text if n and n[0].text and n[0].text.strip() else default


def generate_mei(input_mei, order, tmp_dir, output_mei):
    # Fix mei exported from musescore: promote the profile (mei-basic -> mei-all,
    # 5.0+basic -> 5.0) and add an empty <pgHead> under <scoreDef> as the anchor
    # that pgHead.xsl fills in with the title block.
    raw = Path(input_mei).read_text(encoding="utf-8")
    raw = raw.replace("mei-basic", "mei-all").replace("5.0+basic", "5.0")
    tree = ET.parse(BytesIO(raw.encode("utf-8")))
    root = tree.getroot()
    for scoreDef in root.xpath('//mei:score/mei:scoreDef', namespaces=NSMAP):
        ET.SubElement(scoreDef, f'{{{MEI_NS}}}pgHead')

    ordinal = re.sub(r"^0*([0-9]*)", r"\1º", str(order))

    # Title and authors for the pgHead come from the MEI's own titleStmt (single
    # source of truth), not from tonos.json / index.json.
    title = root.xpath('//mei:titleStmt/mei:title[@type="main"]/text()', namespaces=NSMAP)
    title = title[0] if title else ""
    composer = _persname(root, '//mei:composer/mei:persName')
    poet = _persname(root, '//mei:lyricist/mei:persName')

    result = apply_xslt(tree, str(XSLT_DIR / 'pgHead.xsl'), title=title, ordinal=ordinal, poet=poet, composer=composer)
    result.write(output_mei, encoding="utf-8", xml_declaration=True)


def verovio_cmd(mei_file, mei_unit, mei_scale, out_svg):
    """Build the verovio command from the named VEROVIO_OPTIONS/FLAGS."""
    cmd = ["verovio", "--unit", mei_unit, "--scale", mei_scale]
    for key, value in VEROVIO_OPTIONS.items():
        cmd += [f"--{key}", value]
    cmd += VEROVIO_FLAGS
    cmd += ["-o", out_svg, mei_file]
    return cmd


def render_mei(mei_file, mei_unit, mei_scale, tmp_dir, output_name, expand_annotations, normalize_ficta):
    for svg in glob.glob(os.path.join(tmp_dir, '*.svg')):
        os.remove(svg)

    if expand_annotations:
        run(['python', str(PIPELINE_SCRIPTS_DIR / 'expand_annots.py'), mei_file,
             f'{tmp_dir}/expanded.mei', f'{tmp_dir}/annotations.json'])
        (Path(tmp_dir) / 'expanded.mei').rename(mei_file)

    if normalize_ficta:
        run(['python', str(REPO_ROOT / 'scripts' / 'normalize_ficta.py'), mei_file, f'{tmp_dir}/normalized.mei'])
        (Path(tmp_dir) / 'normalized.mei').rename(mei_file)

    workaround_verovio_2divs_bug(mei_file)
    run(verovio_cmd(mei_file, mei_unit, mei_scale, f'{tmp_dir}/output.svg'))

    if expand_annotations:
        print("Injecting annotations as foot notes into svgs")
        run(['python', str(PIPELINE_SCRIPTS_DIR / 'annotate_svg.py'), tmp_dir, f'{tmp_dir}/annotations.json'])

    svgs = sorted(glob.glob(os.path.join(tmp_dir, '*.svg')))
    run(['svgs2pdf', '-m', output_name, '-o', tmp_dir] + svgs)

    if not Path(output_name).is_file():
        f = Path(tmp_dir) / 'output_001.pdf'
        if f.is_file():
            f.rename(f'{tmp_dir}/{output_name}')
        else:
            f = Path(tmp_dir) / 'output.pdf'
            if f.is_file():
                f.rename(f'{tmp_dir}/{output_name}')



def add_titles(mei_file, poem):
    blocks = poem.blocks if poem else []
    # A single overlaid block (e.g. just "Coplas") gets no section heading.
    if len(blocks) == 1 and not blocks[0].custom:
        return
    for block in blocks:
        for section, title in block.titles:
            insert_title_in_mei(mei_file, section, title)





def generate_score(order, data, tmp_dir, buildType):

    mei_unit = str(data.get('meiUnit', 8.0))
    mei_scale = str(data.get('meiScale', 100))
    tmp_file = f"{tmp_dir}/tmp1.mei"
    generate_mei(data['meiFile'], order, tmp_dir, tmp_file)
    add_titles(tmp_file, data['poem'])

    write_pretty_mei(tmp_file, f'{tmp_dir}/final.mei')

    if buildType is EditionType.PERFORMER:
        # Render the full version of all sections
        print("Generating performer full score")
        render_mei(tmp_file, mei_unit, mei_scale, tmp_dir, "full-score.pdf", False, True)
        return "full-score.pdf"
    elif buildType is EditionType.SCHOLAR:
        print("Generating scholar score with single verse and expanded annotations")
        single_verse_mei = f'{tmp_dir}/single-verse-sections.mei'
        shutil.copy(tmp_file, single_verse_mei)
        delete_extra_verses(single_verse_mei)
        groups = poem_from_mei.overlay_groups(data['poem']) if data['poem'] else []
        inject_section_place_holders(single_verse_mei, groups)
        single_verse_pdf = f'single_verse_sections.pdf'
        render_mei(single_verse_mei, mei_unit, mei_scale, tmp_dir, single_verse_pdf, True, False)
        overlay.overlay_extra_text(groups, f"{tmp_dir}/{single_verse_pdf}", tmp_dir,
                                   render_latex)
        return single_verse_pdf
    else:
        return None


CRITERIOS_TEX = {
    EditionType.PERFORMER: "criterios-musicales-performer.tex",
    EditionType.SCHOLAR: "criterios-musicales-scholar.tex",
}


def build_values_tex(data, version, buildType):
    """The \\def macros consumed by header.tex via values.tex."""
    tex = format_version(version)
    tex += format_titles(data['number'], data['title'], data['music_author'], data['text_author'])
    tex += format_edition(buildType)
    tex += format_status(data)
    if CONFIG.pre_release:
        tex += "\\def\\prerelease{true}\n"
    return tex


def music_data_json(data):
    enc = data['encodingProperties']
    return json.dumps({
        "organic": data['organic'],
        "high_clefs": data['high_clefs'],
        "original_armor": enc['originalArmor'],
        "transposition": enc['encodedTransposition'],
        "encoded_armor": enc['encodedArmor'],
    })


def build_tono_body(data, buildType, out_dir, with_criterios=True):
    """The composable body of one tono (intro, text, score, facsímil). Side
    effects: runs pandoc/verovio (via generate_score) and writes intro.tex,
    text_comments.tex, music_comments.tex, facsimil.tex and the score PDF into
    out_dir. Assets are referenced by absolute path, so this body can be \\input
    into either a single-tono document or the book. `with_criterios` prints the
    music-edition criteria (once, up front, in the book). Returns (body tex, score)."""
    os.makedirs(out_dir, exist_ok=True)
    doc = Latex()

    intro = data.get('introductionFile') or ''
    if intro and intro != "null":
        out = f'{out_dir}/intro.tex'
        run(['pandoc', Path(intro), '-o', out, '--from', 'markdown+autolink_bare_uris'])
        doc.section("Introducción").input(out)

    doc.raw(format_text_part(data['poem'], out_dir))

    generated_score = generate_score(data['number'], data, out_dir, buildType)

    doc.section("Edición musical", centered=False)
    if with_criterios:
        doc.input(CRITERIOS_TEX[buildType])

    if generated_score is not None:
        params = music_data_json(data)
        print(params)
        print("Generating comments from mei file")
        doc.raw(generate_music_comments_from_mei_file(data['meiFile'], params, out_dir, buildType))

    doc.raw(generate_audio_link(data, buildType))

    if generated_score is not None:
        doc.line(f"\\includepdf[pages=-]{{{out_dir}/{generated_score}}}")

    (Path(out_dir) / 'facsimil.tex').write_text(get_facsimil(data['facsimileItems']))
    doc.input(f"{out_dir}/facsimil.tex")

    return str(doc), generated_score


def build_tono_document(data, buildType, tmp_dir):
    """Full single-tono document: cover + body + acerca."""
    doc = Latex()
    doc.raw(format_init())
    body, generated_score = build_tono_body(data, buildType, tmp_dir)
    doc.raw(body)
    doc.line("\\clearpage").input("acerca.tex").raw("\\end{document}")
    return str(doc), generated_score


def book_edition_label(buildType):
    return "Edición para intérpretes" if buildType is EditionType.PERFORMER else "Edición crítica"


def book_values_tex(edition):
    """Minimal values.tex for the book preamble: the per-tono value macros
    aren't used by the bodies, so just define them to keep nothing undefined."""
    return (f"\\def\\myedition{{{edition}}}\n\\def\\myversion{{}}\n"
            "\\def\\mytitle{}\n\\def\\mystatustext{}\n\\def\\mystatusmusic{}\n")


def format_book_init(edition):
    """Book preamble + a global cover + the table of contents."""
    return ("\\documentclass[12pt, a4paper, twoside,hidelinks]{article}\n"
            "\\usepackage{iberianpolyphony}\n"
            "\\addcovermanuscriptbackground\n"
            "\\input{header.tex}\n"
            "\\begin{document}\n"
            "\\begin{titlepage}\n\\centering\n\\vspace*{3cm}\n"
            "{\\Huge\\scshape \\textcolor{iberianRed}{Cancionero de Miranda}\\par}\n"
            "\\vspace{1cm}\n"
            f"{{\\Huge \\textcolor{{iberianGold}}{{{edition}}}\\par}}\n"
            "\\vspace{2cm}\n\n"
            "\\parbox[b]{0.6\\textwidth}{\\centering\\itshape\\large "
            "Misçelanea de Tonos de varios autores a 4º do Pe. Dos. de Mirda "
            "da Costa Cappellão cantor da Cappella Real}\n"
            "\\end{titlepage}\n"
            "\\tableofcontents\n\\clearpage\n")


def build_book(tonos, buildType, tmp_dir):
    """One LaTeX document with every tono: global cover + TOC + criteria, then
    each tono's body (no per-tono cover), continuous page numbering, and
    `acerca` once at the end. `tonos` is a list of prepared data dicts."""
    edition = book_edition_label(buildType)
    (Path(tmp_dir) / 'values.tex').write_text(book_values_tex(edition))

    doc = Latex()
    doc.raw(format_book_init(edition))
    doc.section("Criterios de edición musical").input(CRITERIOS_TEX[buildType])

    for data in tonos:
        n, title = data['number'], data['title']
        print(f"** Book: tono {n}: {title} [{buildType}] **")
        out_dir = f"{tmp_dir}/t{n}"
        body, _ = build_tono_body(data, buildType, out_dir, with_criterios=False)
        doc.line("\\clearpage").line("\\phantomsection")
        doc.line(f"\\addcontentsline{{toc}}{{section}}{{{n}. {escape_latex(title)}}}")
        doc.line(f"\\markright{{{escape_latex(title)}}}")
        doc.line(f"\\section*{{\\centering\\Huge {n}. {escape_latex(title)}}}")
        doc.raw(body)

    doc.line("\\clearpage").input("acerca.tex").raw("\\end{document}")
    return str(doc)


def generate_book(scores, status, tono_limit, buildType, tmp_dir):
    """Prepare the tonos and render the whole-book PDF (two LaTeX passes for the
    TOC). `tono_limit` (1-based) builds only the first N tonos, for testing."""
    tonos = []
    for i, score in enumerate(scores):
        if tono_limit and i >= tono_limit:
            break
        if not score.get('meiFile') or score['meiFile'] in ("", "null"):
            continue
        tonos.append(prepare_tono_data(score, status[i] if i < len(status) else {}))

    latex_str = build_book(tonos, buildType, tmp_dir)
    (Path(tmp_dir) / 'tmp.tex').write_text(latex_str)
    print(f"Rendering book ({len(tonos)} tonos) — pass 1/2")
    render_latex(tmp_dir, 'tmp.tex')
    print("Rendering book — pass 2/2 (table of contents)")
    render_latex(tmp_dir, 'tmp.tex')

    os.makedirs("output", exist_ok=True)
    out = f"output/Cancionero_de_Miranda_{buildType.value.capitalize()}_libro.pdf"
    shutil.move(f"{tmp_dir}/tmp.pdf", out)
    print(f"Libro generado: {out}")
    return out


# A key signature as a signed count (sharps +, flats -). Transposing the score
# up a perfect fourth (the inverse of the '-P4' encoding) shifts it one flat.
_ARMOR_UNTRANSPOSE = {'': 0, '-P4': -1}


def _armor_signed(a):
    return 0 if not a or a == 'n' else int(a[:-1]) * (1 if a.endswith('s') else -1)


def _armor_str(v):
    return 'n' if v == 0 else f"{abs(v)}{'s' if v > 0 else 'f'}"


def derive_armor(mei_file, transposition):
    """(originalArmor, encodedArmor) from the MEI. encodedArmor is the first
    scoreDef's staffDef @keysig (or 'n' when there is none); originalArmor is it
    un-transposed by the editorial transposition."""
    root = ET.parse(mei_file).getroot()
    sigs = {sd.get('keysig')
            for sd in root.xpath('(//mei:scoreDef)[1]//mei:staffDef', namespaces=NSMAP)
            if sd.get('keysig')}
    encoded = next(iter(sigs)) if len(sigs) == 1 else 'n'
    if transposition not in _ARMOR_UNTRANSPOSE:
        print(f"  WARNING: unknown transposition {transposition!r}; originalArmor=encodedArmor")
    original = _armor_str(_armor_signed(encoded) + _ARMOR_UNTRANSPOSE.get(transposition, 0))
    return original, encoded


def prepare_tono_data(data, status):
    """Resolve file paths and enrich a tono's config for building: full paths,
    the parsed poem, authors/status/organic, armor, high-clefs flag. Returns the
    data dict (a copy)."""
    directory = 'tonos/' + data['path']
    data = {key: directory + "/" + data[key]  if key in [ 'introductionFile', 'meiFile'] and data[key] != "" else data[key] for key in data.keys()}

    # The poetic text and notes live in the MEI (<back><div type="poem">), the
    # single source Verovio already loads; parse it into a rich Poem object.
    data['poem'] = poem_from_mei.parse(data['meiFile'])

    # The rendered title comes from the MEI's titleStmt (cover, pgHead, book all
    # agree); tonos.json keeps its own title only for work selection.
    mt = ET.parse(data['meiFile']).getroot().xpath(
        '//mei:titleStmt/mei:title[@type="main"]/text()', namespaces=NSMAP)
    if mt and mt[0].strip():
        data['title'] = mt[0].strip()

    composer, lyricist = get_entries_from_mei(data['meiFile'])
    data['music_author'] = composer
    data['text_author'] = lyricist
    data['status_text'] = status['status_text']
    data['status_music'] = status['status_music']
    data['organic'] = status.get('organic', '')  # merged from tonos/index.json in main()

    # Key signatures come from the MEI (single source of truth): encodedArmor is
    # the score's keySig; originalArmor is it un-transposed by the editorial
    # transposition (which stays in tonos.json as encodedTransposition).
    encoding = data['encodingProperties']
    original, encoded = derive_armor(data['meiFile'], encoding.get('encodedTransposition', ''))
    encoding['originalArmor'], encoding['encodedArmor'] = original, encoded
    data['high_clefs'] = original != encoded
    return data


def generate_tono(data, status, tmp_dir, buildType):

    if 'meiFile' not in data or data['meiFile'] == "" or  data['meiFile'] == "null":
        return

    print(f"** Building tono {data['number']}: {data['title']} type: {buildType} **")

    data = prepare_tono_data(data, status)

    # Version from the sources the PDF depends on. The text now lives in the MEI,
    # so meiFile's git history already captures text/notes changes.
    files = [data[key] for key in ['meiFile', 'introductionFile'] if data.get(key)]
    vers = get_version_from_git(files)
    print(f"Version based on # of git revisions: {vers}")

    values = build_values_tex(data, vers, buildType)
    latexStr, generated_score = build_tono_document(data, buildType, tmp_dir)

    (Path(tmp_dir) / 'values.tex').write_text(values)
    (Path(tmp_dir) / 'tmp.tex').write_text(latexStr)

    print("Rendering final pdf")
    render_latex(tmp_dir, 'tmp.tex')

    os.makedirs("output", exist_ok=True)

    pdfname = output_pdf_path(data, buildType)
    meiname = f'output/{str(data["number"]).zfill(2)}_{normalize_title(data["title"])}.mei'

    if generated_score is not None and (Path(tmp_dir) / 'final.mei').exists():
        shutil.copy(f'{tmp_dir}/final.mei', meiname)
        print(f"MEI score: {meiname}")
        # Embed the MEI as a document-level attachment (replaces pdftk attach_files).
        doc = fitz.open(f'{tmp_dir}/tmp.pdf')
        doc.embfile_add(os.path.basename(meiname), Path(meiname).read_bytes(),
                        filename=os.path.basename(meiname))
        doc.save(pdfname, garbage=3, deflate=True)
        doc.close()
    else:
        shutil.move(f'{tmp_dir}/tmp.pdf', pdfname)

    print("Tono generado: ")
    print(f"\t{pdfname}")
    print(f"\t{meiname}")

    return pdfname


def run_doctor(verbose=True):
    """Check that every external tool and Python module the pipeline needs is
    available. Returns True if all present. With verbose=False only missing
    dependencies are printed (used as a preflight before building)."""
    import importlib.util

    checks = []  # (category, name, ok, detail)
    for tool in REQUIRED_TOOLS:
        path = shutil.which(tool)
        checks.append(("herramienta", tool, path is not None, path or "NO ENCONTRADO en PATH"))
    for mod in REQUIRED_PYTHON:
        found = importlib.util.find_spec(mod) is not None
        checks.append(("módulo Python", mod, found, "instalado" if found else "NO INSTALADO (pip install -r requirements.txt)"))

    missing = [c for c in checks if not c[2]]

    if verbose:
        print("Comprobando dependencias del pipeline:\n")
        for category, name, ok, detail in checks:
            print(f"  {'✓' if ok else '✗'} [{category}] {name} — {detail}")
        print()

    if missing:
        if not verbose:
            print("Faltan dependencias necesarias:")
            for category, name, ok, detail in missing:
                print(f"  ✗ [{category}] {name} — {detail}")
        print(f"\n{len(missing)} dependencia(s) ausente(s). "
              f"Instálalas o usa --skip-doctor para intentarlo igualmente.")
        return False

    if verbose:
        print("Todo listo: todas las dependencias están disponibles.")
    return True


def normalize_title(title):
    return unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('ascii').replace(' ', '_')


def output_pdf_path(data, buildType):
    return (f'output/{str(data["number"]).zfill(2)}_{normalize_title(data["title"])}'
            f'_{buildType.value.capitalize()}_edition.pdf')


def tono_input_files(data):
    """Source files (unresolved config) whose contents affect this tono's PDF.
    The poetic text + notes live in the MEI now, so meiFile covers them."""
    directory = 'tonos/' + data['path']
    files = []
    for key in ('meiFile', 'introductionFile'):
        v = data.get(key, '')
        if v and v != "null":
            files.append(f"{directory}/{v}")
    return files


def _hash_paths(hasher, paths):
    for p in sorted(paths):
        hasher.update(b'\0' + p.encode() + b'\0')
        try:
            with open(p, 'rb') as f:
                hasher.update(f.read())
        except FileNotFoundError:
            hasher.update(b'MISSING')


def shared_assets_hash():
    h = hashlib.sha256()
    _hash_paths(h, SHARED_ASSETS)
    return h.hexdigest()


def tool_versions_hash():
    """Best-effort fingerprint of the external tools that shape the output."""
    h = hashlib.sha256()
    for cmd in (['verovio', '--version'], [CONFIG.latex_engine, '--version'], ['pandoc', '--version']):
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=15).stdout or ""
        except Exception:
            out = ""
        h.update(cmd[0].encode())
        h.update(out.encode())
    return h.hexdigest()


def compute_job_fingerprint(data, tono_status, buildType, shared_hash, tool_hash):
    h = hashlib.sha256()
    h.update(shared_hash.encode())
    h.update(tool_hash.encode())
    h.update(str(buildType).encode())
    h.update(json.dumps(data, sort_keys=True, ensure_ascii=True).encode())
    h.update(json.dumps(tono_status, sort_keys=True, ensure_ascii=True).encode())
    _hash_paths(h, tono_input_files(data))
    return h.hexdigest()


def load_manifest():
    try:
        with open(BUILD_MANIFEST) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_manifest(manifest):
    os.makedirs("output", exist_ok=True)
    with open(BUILD_MANIFEST, "w") as f:
        json.dump(manifest, f, indent=2, sort_keys=True)


def resolve_worker_count(requested, njobs):
    """How many tonos to build in parallel. requested>0 caps it; 0 = auto
    (leave 2 cores free); never more than the number of jobs."""
    if njobs <= 1:
        return 1
    if requested and requested > 0:
        return min(requested, njobs)
    return max(1, min((os.cpu_count() or 2) - 2, njobs))


def build_one(job, parent_tmp):
    """Build a single (tono, status, buildType) job in its own temp dir, with
    stdout/stderr captured to a per-job log so parallel workers don't interleave.
    Returns (label, status, error, pdf_path, fingerprint). Module-level + a fork
    context (see main) so workers inherit the configured CONFIG."""
    tono, tono_status, buildType, fingerprint, pdf_path = job
    label = f"tono {tono['number']} [{buildType}]"
    job_tmp = tempfile.mkdtemp(prefix=f"{tono['path']}-{buildType.value}-", dir=parent_tmp)
    CONFIG.tmp_dir = job_tmp
    try:
        with open(os.path.join(job_tmp, "build.log"), "w") as lf, \
             contextlib.redirect_stdout(lf), contextlib.redirect_stderr(lf):
            generate_tono(tono, tono_status, job_tmp, buildType)
        return (label, "ok", None, pdf_path, fingerprint)
    except Exception as e:
        return (label, "failed", f"{type(e).__name__}: {e}", pdf_path, fingerprint)
    finally:
        if not CONFIG.debug:
            shutil.rmtree(job_tmp, ignore_errors=True)


def build_jobs(scores, status, tono_idx, edition):
    """Return the list of (tono, status, buildType) to generate."""
    editions = [EditionType(edition)] if edition else list(EditionType)
    indices = [tono_idx] if tono_idx is not None else range(len(scores))
    jobs = []
    for idx in indices:
        tono_status = status[idx] if idx < len(status) else {}
        for buildType in editions:
            jobs.append((scores[idx], tono_status, buildType))
    return jobs


def print_summary(results):
    ok = [r for r in results if r[1] == "ok"]
    skipped = [r for r in results if r[1] == "skipped"]
    failed = [r for r in results if r[1] == "failed"]
    marks = {"ok": "✓", "skipped": "•", "failed": "✗"}
    print("\n" + "=" * 64)
    print(f"Resumen: {len(ok)} ok, {len(skipped)} sin cambios, "
          f"{len(failed)} con fallo, {len(results)} total")
    for label, st, err in results:
        print(f"  {marks[st]} {label}" + (" (sin cambios)" if st == "skipped" else ""))
    if failed:
        print("\nDetalle de los fallos:")
        for label, st, err in failed:
            print(f"\n--- {label} ---\n{err}")
    print("=" * 64)


def main():
    parser = argparse.ArgumentParser(
        description="Genera los PDFs (edición de intérpretes y musicológica) del Cancionero de Miranda")
    parser.add_argument("tono", nargs="?", type=int,
                        help="Número de tono (1-based). Si se omite, se generan todos.")
    parser.add_argument("edition", nargs="?", choices=[e.value for e in EditionType],
                        help="Tipo de edición. Si se omite, se generan ambas.")
    parser.add_argument("--fail-fast", action="store_true",
                        help="Detenerse en el primer fallo en vez de continuar con el resto.")
    parser.add_argument("--force", action="store_true",
                        help="Regenerar aunque el manifiesto indique que no hay cambios.")
    parser.add_argument("--doctor", action="store_true",
                        help="Comprobar que están todas las dependencias y salir.")
    parser.add_argument("--skip-doctor", action="store_true",
                        help="No comprobar las dependencias antes de generar.")
    parser.add_argument("--clean-tmp", action="store_true",
                        help="Borrar los ficheros intermedios al terminar (por defecto se conservan).")
    parser.add_argument("-j", "--jobs", type=int, default=0,
                        help="Nº de tonos a construir en paralelo (0 = auto según CPU, 1 = secuencial).")
    parser.add_argument("--book", nargs="?", const="performer",
                        choices=[e.value for e in EditionType],
                        help="Generar un único PDF 'libro' con todos los tonos seguidos "
                             "(sin portadas por tono, páginas continuas e índice). "
                             "Edición opcional: --book scholar (por defecto performer). "
                             "Con un número de tono, hace un libro de los primeros N (prueba).")
    parser.add_argument("--engine", default=LATEX_RENDERED,
                        choices=["pdflatex", "lualatex", "xelatex"],
                        help="Motor LaTeX a usar (por defecto pdflatex).")
    args = parser.parse_args()

    if args.doctor:
        sys.exit(0 if run_doctor(verbose=True) else 1)

    if not args.skip_doctor and not run_doctor(verbose=False):
        sys.exit(3)

    tmp_dir = tempfile.mkdtemp()
    CONFIG.tmp_dir = tmp_dir
    CONFIG.debug = not args.clean_tmp
    CONFIG.latex_engine = args.engine

    with open(os.path.join("tonos", "tonos.json")) as f:
        config = json.load(f)
        scores = config['scores']
        for index, score in enumerate(scores):
            score['number'] = str(index + 1)
        # Single source of truth for the base URL (was duplicated as a constant).
        base = config.get('settings', {}).get('basePath')
        if base:
            CONFIG.base_url = base.rstrip('/')

    with open(os.path.join("tonos", "status.json")) as f:
        status = json.load(f)

    # Organic is derived from each MEI's perfMedium and cached in tonos/index.json
    # (see scripts/build_index.py). Merge it into the status entries so the rest
    # of the pipeline keeps reading data['organic'] unchanged.
    try:
        with open(os.path.join("tonos", "index.json")) as f:
            index_by_path = {e['path']: e for e in json.load(f)}
        for i, score in enumerate(scores):
            if i < len(status):
                entry = index_by_path.get(score['path'], {})
                if entry.get('organic'):
                    status[i]['organic'] = entry['organic']
    except FileNotFoundError:
        pass

    if args.book:
        generate_book(scores, status, args.tono, EditionType(args.book), tmp_dir)
        if not CONFIG.debug:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        return

    tono_idx = None
    if args.tono is not None:
        tono_idx = args.tono - 1
        if tono_idx < 0 or tono_idx >= len(scores):
            print(f"No such tono: {args.tono}", file=sys.stderr)
            sys.exit(2)

    jobs = build_jobs(scores, status, tono_idx, args.edition)

    # Fingerprints for incremental builds (computed once per run).
    shared_hash = shared_assets_hash()
    tool_hash = tool_versions_hash()
    manifest = load_manifest()

    # Decide skip vs build up-front (cheap), then build — possibly in parallel.
    results = []
    to_build = []
    for tono, tono_status, buildType in jobs:
        label = f"tono {tono['number']} [{buildType}]"
        fingerprint = compute_job_fingerprint(tono, tono_status, buildType, shared_hash, tool_hash)
        pdf_path = output_pdf_path(tono, buildType)
        if not args.force and manifest.get(pdf_path) == fingerprint and os.path.exists(pdf_path):
            print(f"=== Skipping {label} (sin cambios) ===")
            results.append((label, "skipped", None))
        else:
            to_build.append((tono, tono_status, buildType, fingerprint, pdf_path))

    workers = resolve_worker_count(args.jobs, len(to_build))

    def record(res):
        """Consume a finished job in the main process (manifest writes are serial
        here, so no locking needed). Returns the job status."""
        label, st, err, pdf_path, fingerprint = res
        if st == "ok":
            manifest[pdf_path] = fingerprint
            print(f"  ✓ {label}", flush=True)
        else:
            manifest.pop(pdf_path, None)
            print(f"  ✗ FALLO en {label}: {err}", file=sys.stderr, flush=True)
        save_manifest(manifest)
        results.append((label, st, err))
        return st

    try:
        if to_build:
            print(f"\nConstruyendo {len(to_build)} job(s) con {workers} worker(s)...")
        if workers <= 1:
            for job in to_build:
                if record(build_one(job, tmp_dir)) == "failed" and args.fail_fast:
                    break
        else:
            ctx = multiprocessing.get_context("fork")  # inherit the configured CONFIG
            with ProcessPoolExecutor(max_workers=workers, mp_context=ctx) as ex:
                futures = [ex.submit(build_one, job, tmp_dir) for job in to_build]
                for fut in as_completed(futures):
                    if record(fut.result()) == "failed" and args.fail_fast:
                        for f in futures:
                            f.cancel()
                        break
    finally:
        if not CONFIG.debug:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        else:
            print(f"\nIntermediate files kept under {tmp_dir}")

    print_summary(results)
    if any(st == "failed" for _, st, _ in results):
        sys.exit(1)



if __name__ == "__main__":
    main()

