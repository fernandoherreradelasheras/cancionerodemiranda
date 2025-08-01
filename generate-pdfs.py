#!/usr/bin/env python3

import os
import sys
import json
import tempfile
import subprocess
import shutil
import re
import sys
import fitz
import math
from pathlib import Path
from lxml import etree as ET
from copy import deepcopy
from enum import StrEnum, auto

class EditionType(StrEnum):
    PERFORMER = auto()
    SCHOLAR = auto()


# Constants
MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {"mei" : MEI_NS}
MUSE = "MuseScore-Studio.AppImage"
PRE_RELEASE = 1
BASE_URL = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/tonos"
LATEX_RENDERED = "pdflatex"
FACSIMILE_RESIZE = "50"

debug=True

ET.register_namespace("mei", MEI_NS)


def log(message, tmp_dir):
    """Write message to debug log file"""
    with open(os.path.join(tmp_dir, "debug.log"), "a") as f:
        f.write(f"{message}\n")

def msg(message, tmp_dir):
    """Log message and print to stderr"""
    log(message, tmp_dir)
    print(message, file=sys.stderr)


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




def add_image(directory, file, caption, title=None):
    """Generate LaTeX code for including an image"""

    orig_path = f'{directory}/{file}'
    resized_path = orig_path if FACSIMILE_RESIZE == "100" else f'{orig_path}_{FACSIMILE_RESIZE}.jpg'
    path = Path(resized_path)
    if not path.is_file():
        print(f'Resizing image {orig_path} {FACSIMILE_RESIZE}%')
        resize_cmd = [ 'magick', orig_path, '-resize', f'{FACSIMILE_RESIZE}%', resized_path]
        run_cmd(resize_cmd)

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

def get_init():
    """Get initial LaTeX document setup"""
    return "\n".join([
        "\\documentclass[12pt, a4paper, twoside,hidelinks]{article}",
        "\\usepackage{iberianpolyphony}",
        "\\addcovermanuscriptbackground",
        "\\input{header.tex}",
        "\\begin{document}"
    ])

def format_titles(n, title, music, text):
    """Generate title definitions"""
    ordinal = f"{int(n)}º"
    str = f"\\def\\mytitle{{\\centering \\LARGE Tono {ordinal}: {title} \\\\}}\n" \
        + f"\\def\\mymusic{{{music}}}\n" \
        + f"\\def\\mytext{{{text}}}\n"
    
    return str

def get_version_from_git(files):
    """Get version based on git revision count"""
    try:
        cmd = ["git", "rev-list", "--count", "main", "--"] + files
        rev_count = subprocess.check_output(cmd).decode().strip()
        return rev_count
    except subprocess.CalledProcessError:
        return 0
    
    
def render_latex(dir, file):
    cmd = [LATEX_RENDERED, "-interaction=batchmode", f"-output-directory={dir}", f"{dir}/{file}" ]
    run_cmd(cmd)

    
def run_cmd(cmd):
    try:
         print(subprocess.check_output(cmd).decode().strip())
    except Exception as e:
        print(f"Error running command: \n{cmd}\noutput: {e.output}")
        raise(e)
        
    

def format_version(version):
    return f"\\def\\myversion{{0.{version}}}\n"

def format_edition(buildType):
    if buildType == EditionType.PERFORMER:
        return  "\\def\\myedition{Edición para intérpretes}\n"
    elif buildType == EditionType.SCHOLAR:
        return  "\\def\\myedition{Edición musicológica}\n"


def format_status(data):
    str = ""
    status_text=data['status_text']
    status_music=data['status_music']

    str = str + f"\\def\\mystatustext{{{status_text}}}\n"
    str = str +  f"\\def\\mystatusmusic{{{status_music}}}\n"
    

    for status in [ status_text, status_music ]:
        if status != "completed": 
            str = str + "\\DraftwatermarkOptions{stamp=true}\n" 
            break
			
    return str


def get_images(dir, items):
    output = ""
    print(items)
    for item in items:
        output = output + add_image(dir, item['file'], item['name'])
    return output
    
    
def get_facsimil(items):
    
    latexStr = get_images("facsimil-images", items)
 
    return latexStr
    

def format_init():
    return "\\documentclass[12pt, a4paper, twoside,hidelinks]{article}\n" \
        + "\\usepackage{iberianpolyphony}\n" \
        + "\\addcovermanuscriptbackground\n" \
        + "\\input{header.tex}\n" \
        + "\\begin{document}\n" \
        + "\\customtitlepage{\\mytitle}\n"


def txt_to_tex(txt):
    """Convert text file to LaTeX format"""
    result = []
    ignore_until_next = False
    

    for line in txt.splitlines():
        line = line.strip()
        if not line:
            if not ignore_until_next:
                result.append('!')
            ignore_until_next = False
        else:
            if line.startswith("%append_to_score_section="):
                if line == "%append_to_score_section=respuesta":
                    ignore_until_next = True
                else:
                    ignore_until_next = False
            if not ignore_until_next:
                result.append(" ")
                result.append(f"{line} \\\\")
    
    return "\n".join(result)

def format_text_part(transcription, comments, tmp_dir):
    str = "\\section*{\\centering\\LARGE{Texto poético}}" \
	    + "\\begingroup\n" \
	    + "\\centering\n" \
	    + "\\Large\n" \
	    + "\\itshape\n" \
	    + "\\settowidth{\\versewidth}{xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx}\n" \
	    + "\\setlength{\\vrightskip}{-3em}\n" \
	    + "\\begin{verse}[\\versewidth]\n" \
	    + "\\poemlines{5}\n"
     
    print(f'Building LaTEX code for the text edition')
    for section in transcription:
        print(f'building section from {section['file']}')
        contents = Path(section['file']).read_text()
        
        # Add heading only if there is more than one section
        if len(transcription) > 1:
            if 'append_to' and 'name' in section:
                name = section['name']
                str = str + "\\flagverse{\\textnormal{%s}}\n" % name 
            else:
                str = str + "\\flagverse{\\textnormal{Estribillo}}\n" 
        str = str + txt_to_tex(contents)        
         

    str = str + "\\poemlines{0}\n"
    str = str + "\\end{verse}\n"
    str = str + "\\endgroup\n"

    if comments:
        cmd = [ 'pandoc', Path(comments), '-o', f'{tmp_dir}/text_comments.tex']
        run_cmd(cmd)
        print(f'Adding text comments: {comments}')
        str = str + "\\subsection*{Notas al texto poético}\n"
        str = str + "\\noindent\n" 
        str = str + "\\input{text_comments.tex}" 

    return str

def generate_audio_link(data, buildType):
    if not 'audioBaseFile' in data:
        return ''

    audio = data['audioBaseFile']
    url = f"{BASE_URL}/{data['path']}/{audio}"

    output = "\\subsection*{Recursos online}\n"
    output = output + "\\noindent\n" 
    output = output + f"Interpretación de audio generada por software disponible en:\n\n"
    #{\hypersetup{allcolors=magenta}{\href{stackexchange.com}{do not hide this link}}}
    output = output + "\\begin{center}\n"
    output = output + "\\setlength{\\fboxsep}{10pt}\n"
    output = output + f"\\fbox{{\\hypersetup{{urlcolor=black}}{{\\qrcode[hyperlink,height=2.5cm]{{{url}}}}}}}\n"
    output = output + "\\end{center}\n"

    return output



def generate_comments_from_mei_file(mei_file, json_params, tmp_dir, buildType):
    annotations =  "--extractAnnotations" if buildType is EditionType.PERFORMER else "--noExpandAnnotations"
    cmd = [ 'python',  './scripts/extract_comments_from_mei.py', mei_file, json_params, annotations, f'{tmp_dir}/music_comments.tex' ]
    run_cmd(cmd)
    return "\\input{music_comments.tex}\n"


def get_contents_for_section(section, blocks_to_inject):
    contents = ""
    for block in blocks_to_inject:
        if block['append_to'] == "@custom":
            contents = contents + filter_text_file_for_section(block['file'], section)
        elif block['append_to'] == section:
            contents = contents +  Path(block['file']).read_text()
            
    return contents
            
            
    

def count_content_for_section(section, blocks_to_inject):
    contents = get_contents_for_section(section, blocks_to_inject)
    first_stanza_end=contents.find("\n\n")
    contents = contents[first_stanza_end+2:-1]

    stanzas = 1 + contents.count('\n\n')
    lines = contents.count('\n') - stanzas - 1
    print(f'section {section} -> lines: {lines}  stanzas: {stanzas}')
    return lines, stanzas

def run_xmlstarlet(args):
    cmd = "xmlstarlet ed -L -N mei=\"http://www.music-encoding.org/ns/mei\" " + args
    subprocess.check_output(['sh', '-c', cmd]).decode().strip()

def mei_has_more_than_1verse(file):
    cmd = ['xmlstarlet', 'sel', '-N', 'mei=http://www.music-encoding.org/ns/mei', '-t', '-v', 'count(//mei:verse[@n="2"])', file]
    count = int(subprocess.check_output(cmd).decode().strip())
    return count > 0

def mei_section_has_more_than_1verse(file, sectionN):
    cmd = ['xmlstarlet', 'sel', '-N', f'mei=http://www.music-encoding.org/ns/mei', '-t', '-v', f'count((//mei:section)[{sectionN}]//mei:verse[@n="2"])', file]
    count = int(subprocess.check_output(cmd).decode().strip())
    return count > 0


def mei_count_sections(file):
    cmd = ['xmlstarlet', 'sel', '-N', 'mei=http://www.music-encoding.org/ns/mei', '-t', '-v', 'count(//mei:section)', file]
    return int(subprocess.check_output(cmd).decode().strip())
    


def insert_title_in_mei(mei_file, section, title):
    title = title.replace('_', ' ').capitalize()

    print(f"Injecting {section} heading {title} into the mei score")
    
    path = f"//mei:section[@label=\"{section}\"]/mei:measure[1]"
    run_xmlstarlet(f"-s '{path}' -t elem -n 'dir place=\"above\" staff=\"1\" tstamp=\"0\"' {mei_file}")

    path = path + "/mei:dir"
    run_xmlstarlet(f"-s '{path}' -t elem -n rend -v '{title}' {mei_file}")

    path = path + "/mei:rend"
    run_xmlstarlet(f"-i '{path}' -t attr -n fontsize -v large {mei_file}")
    run_xmlstarlet(f"-i '{path}' -t attr -n fontweight -v bold {mei_file}")
    
def runXslt(mei_file, xslt_file, params):
    cmd = [ 'java', '-cp', '/usr/share/java/saxon/saxon-he.jar', 'net.sf.saxon.Transform', f'-s:{mei_file}', f'-xsl:{xslt_file}', '-o:.tmpxslt-mei' ]
    for k,v in params.items():
        cmd.append(f"{k}={v}")
              
    run_cmd(cmd)
    
    shutil.move(".tmpxslt-mei", mei_file)
    
def get_sections_from_custom_append(file):
    PREFIX = "%append_to_score_section="
    sections = set()
    contents = Path(file).read_text()
    for line in contents.splitlines():
        if line.startswith(PREFIX):
            section = line.replace(PREFIX, '')
            sections.add(section)
    return list(sections)
            

def filter_text_file_for_section(file, section):
    MATCH = f'%append_to_score_section={section}'
    result = ""
    onSection = False
    contents = Path(file).read_text()
    for line in contents.splitlines(keepends = False):
        if not onSection:
            if line == MATCH:
                onSection = True
        else:
            if line == "" or line == "\n":
                onSection = False
                result = result + "\n"
            else:
                result = result + line + "\n"
    return result
            

    
    
def get_sections_to_inject(blocks_to_inject):
    sections_to_inject = []
    
    for block in blocks_to_inject:
        if block['append_to'] == "@custom":
            sections_to_inject = sections_to_inject + get_sections_from_custom_append(block['file'])
        else:
            sections_to_inject.append(block['append_to'])
            
    return sections_to_inject



def inject_section_place_holders(mei_file, blocks_to_inject):
    
    if len(blocks_to_inject) <= 0:
        return
    
    sections_to_inject = get_sections_to_inject(blocks_to_inject)
    print(sections_to_inject)
            
    for section in sections_to_inject:        
        lines, stanzas = count_content_for_section(section, blocks_to_inject)
        if lines == 0 or stanzas == 0:
            print(f'section {section} has no verses to append, skipping')
            continue
        
        cols = 3
        stanza_size=lines / stanzas
        printed_lines=int(stanza_size + (lines - 1) / stanza_size / cols * stanza_size + 3 * stanzas)
        print("Injecting placeholder for printed lines: %d" % printed_lines )
      
		# section for the text with the remaining coplas after the music
        injected_section = f"{section}_extra_text"
  
        run_xmlstarlet(f"-a '//mei:section[@label=\"{section}\"]' -t elem -n 'section label=\"{injected_section}\"' {mei_file}")
        
        runXslt(mei_file, 'coplas-placeholder.xsl', {'section': injected_section, 'lines': str(printed_lines)})

def find_and_remove_place_holder(section, pdf, tmp_dir):
    
    shutil.copy(pdf, f"{tmp_dir}/tmp-pdf-with-placeholder-{section}.pdf")

    page_with_placeholder = -1
    offset = -1

    doc = fitz.open(pdf)
    search_term = f'{{{{ %% {section} %% }}}}'
    for idx,page in enumerate(doc):
        found = page.search_for(search_term)
        if len(found) == 1:
            page.add_redact_annot(found[0], '')  # Remove the placeholder text
            page.apply_redactions()  # apply the redaction now
            # convert the position from pdf units to cms
            offset = 0.0352778 * found[0].bl.y
            page_with_placeholder = idx+1


    doc.save(f"{tmp_dir}/tmp-pdf-with-placeholder-hidden-{section}.pdf")
    shutil.copy(f"{tmp_dir}/tmp-pdf-with-placeholder-hidden-{section}.pdf", pdf)
    
    return (page_with_placeholder, offset, len(doc))

def build_verses_overlay(offset, contents, section, initialStanzaCount):

    outputStr = ""

    stanzas = []
    currentStanzaNumber = initialStanzaCount

    verses = []
    longestverses = []
    currentLongestVerse = ""

    lines = contents.splitlines()
    
    print(f"Buidling overlay for section {section}")

    for idx,line in enumerate(lines + [""]):
        if line == "":
            currentStanzaNumber = currentStanzaNumber + 1
            stanzas.append({'stanzaNumber': currentStanzaNumber, 'verses': verses})
            longestverses.append(currentLongestVerse)
            verses = []
        else:
            verses.append(line)
            if len(line) > len(currentLongestVerse):
                currentLongestVerse=line

    stanzasCount = len(stanzas)
    colbreak = stanzasCount // 3 if len(stanzas) > 3 else 1

    outputStr = outputStr + '\\documentclass[a4paper]{memoir}\n'
    outputStr = outputStr + '\\usepackage{paracol}\n'
    outputStr = outputStr + '\\usepackage[utf8]{inputenc}\n'
    outputStr = outputStr + '\\usepackage[T1]{fontenc}\n'
    outputStr = outputStr + '\\usepackage[layout=a4paper,top=%dcm,bottom=1cm,left=0.25cm,right=0.25cm]{geometry}\n' % math.floor(offset)
    outputStr = outputStr + '\\pagenumbering{gobble}\n'
    outputStr = outputStr + '\\begin{document}\n'
    outputStr = outputStr + '\\begin{paracol}{3}\n'

    for stanza_idx, stanza in enumerate(stanzas): 

        if colbreak > 0 and stanza_idx > 0 and stanza_idx % colbreak == 0:
            outputStr = outputStr + '\\switchcolumn\n'

        outputStr = outputStr + '\\settowidth{\\versewidth}{%s}\n' % longestverses[stanza_idx]
        outputStr = outputStr + '\\begin{verse}\n'

        for verse_idx,verse in enumerate(stanza['verses']):
            if verse_idx == 0:
                outputStr = outputStr + '\\textbf{%d.}\\\\\n' % stanza['stanzaNumber']
            outputStr = outputStr + '%s\\\\\n' % verse
        outputStr = outputStr + '\\end{verse}\n'

    outputStr = outputStr + '\\end{paracol}\n'
    outputStr = outputStr + '\\end{document}\n'

    return outputStr





      
def inject_text_into_place_holders(blocks_to_inject, music_pdf, tmp_dir):
    if len(blocks_to_inject) <= 0:
        return
    
    sections_to_inject = get_sections_to_inject(blocks_to_inject)
    for section in sections_to_inject:  
        
        injected_section=f"{section}_extra_text"
               
        (page, offset, pages) = find_and_remove_place_holder(injected_section, music_pdf, tmp_dir)
        
        if page < 0:
            print(f'Cannot find placeholder for section {section} on the rendered pdf. Skipping text injection')
            return

	# Render a pdf with the text rendered at the position where the placeholder was in the score page
        texname = f"stanzas_{section}.tex"
        outputname = f"stanzas_{section}.pdf"
        contents = get_contents_for_section(section, blocks_to_inject)
        
        first_stanza_end=contents.find("\n\n")
        contents = contents[first_stanza_end+2:-1]
        
        latexStr = build_verses_overlay(offset, contents, section, 1)
        
        (Path(tmp_dir) / texname).write_text(latexStr)
        
        render_latex(tmp_dir, texname)
        
	# Extract the page from the score pdf where we want to overlay the pdf with the coplas
        overlay = f'{tmp_dir}/music_page_to_overlay.pdf'
        cmd = [ 'pdftk' , music_pdf, 'cat', str(page),  'output', overlay ]
        run_cmd(cmd)
        

	# Do the overlay operation
        cmd = [ 'pdftk' , overlay, 'background', f"{tmp_dir}/{outputname}",  'output', f'{tmp_dir}/music_with_stanzas.pdf' ]
        run_cmd(cmd)


	# Build back the final music pdf
        if page == 1:
            RANGE="B"
            if pages > 2:
                RANGE+=" A2-end"
            elif pages > 1:
                RANGE+=" A2"
			
        elif page == 2:
            RANGE="A1 B"
            if pages > 3:
                RANGE+=" A3-end"
            elif pages > 2:
                RANGE+=" A3"			
        elif pages == page:
            RANGE=f"A1-{page - 1} B"
        else:
            RANGE=f"A1-{page - 1} B A{page + 1}"
            if pages > (page + 1):
                RANGE+="-end"
					
        range_args = RANGE.split(" ")

        cmd = [ 'pdftk', f'A={music_pdf}', f'B={tmp_dir}/music_with_stanzas.pdf', 'cat'] + range_args + [ 'output', f'{tmp_dir}/music-updated.pdf' ]    
        run_cmd(cmd)
        
        shutil.move(f"{tmp_dir}/music-updated.pdf", music_pdf)
         
   
  


		
    

def generate_mei(input_mei, order, poet, composer, title, tmp_dir, output_mei):
    tmp0 = f'{tmp_dir}/tmp0.mei'
    # Fix mei exported from musescore
    cmd = [ 'sh', '-c', f'sed -e "s/mei-basic/mei-all/g" "{input_mei}"  | sed -e "s/5\\.0+basic/5.0/g" | ' + \
        f'xmlstarlet ed -N  mei="http://www.music-encoding.org/ns/mei" -s "//mei:score/mei:scoreDef" -t elem -n "pgHead" > {tmp0}' ] 
    run_cmd(cmd)
    
    ordinal = re.sub(r"^0*([0-9]*)", r"\1º", str(order))

    if poet == "Anónimo":
        poet = "[Anónimo]"
    if composer == "Anónimo":
        composer = "[Anónimo]"
        
    cmd = [ 'xsltproc', '--stringparam', 'title', title, '--stringparam', 'ordinal', ordinal, '--stringparam', 'poet', poet, '--stringparam', 'composer', composer,
          '-o', output_mei , 'pgHead.xsl', tmp0 ]
    run_cmd(cmd)


def render_mei(mei_file, mei_unit, mei_scale, tmp_dir, output_name, expand_annotations, normalize_ficta):
    cmd = [ 'sh', '-c', f'rm -f {tmp_dir}/*.svg' ]
    run_cmd(cmd)    

    if expand_annotations:
        cmd = [ 'python', './scripts/expand_annots.py', mei_file, f'{tmp_dir}/expanded.mei', f'{tmp_dir}/annotations.json' ]
        run_cmd(cmd)    
        f = Path(tmp_dir) / 'expanded.mei'
        f.rename(mei_file)

    if normalize_ficta:
        cmd = [ 'python', './scripts/normalize_ficta.py', mei_file, f'{tmp_dir}/normalized.mei' ]
        run_cmd(cmd)    
        f = Path(tmp_dir) / 'normalized.mei'
        f.rename(mei_file)



    workaround_verovio_2divs_bug(mei_file)

    cmd = [ 'verovio',  '--unit', mei_unit, '--multi-rest-style', 'auto', '--mdiv-all', '-a', '--mm-output', '--mnum-interval', '0',
            '--bottom-margin-header', '2.5', '--page-margin-left', '150', '--page-margin-right', '150', '--page-margin-top', '50',
           '--lyric-height-factor', '1.2', '--lyric-top-min-margin', '2.5', '--lyric-line-thickness', '0.2', "--no-justification",
            '--bottom-margin-header', '8', '--page-margin-bottom', '50', '--top-margin-pg-footer', '4',  '--header', 'auto', '--footer', 'encoded',
            '--breaks', 'smart', '--breaks-smart-sb', '0.02', '--condense', 'none', '--min-last-justification', '0.2', '--scale', mei_scale, '--scale-to-page-size', '--justify-vertically',
           '--svg-additional-attribute', 'rend@type',
           '-o', f'{tmp_dir}/output.svg', mei_file ]
    print(" ".join(cmd))
    run_cmd(cmd)

    if expand_annotations:
        cmd = [ 'python', './scripts/annotate_svg.py', tmp_dir, f'{tmp_dir}/annotations.json' ]
        print(f"Injecting annotations as foot notes into svgs: {cmd}")
        run_cmd(cmd)    
    
    cmd = [ 'sh', '-c', f'svgs2pdf -m "{output_name}" -o "{tmp_dir}" {tmp_dir}/*.svg' ]
    run_cmd(cmd)    
  
    if not Path(output_name).is_file():
        f = Path(tmp_dir) / 'output_001.pdf'
        if f.is_file():
            f.rename(f'{tmp_dir}/{output_name}')
        else:
            f = Path(tmp_dir) / 'output.pdf'
            if f.is_file():
                f.rename(f'{tmp_dir}/{output_name}')
        
        
        
def add_titles(mei_file, entries):
    if len(entries) == 1 and ('append_to' not in entries[0] or entries[0]['append_to'] != "@custom"):
        return
    
    custom = [entry for entry in entries if 'append_to' in entry and entry['append_to'] == "@custom" ]
    regular_append = [entry for entry in entries if 'append_to' in entry and entry['append_to'] != "@custom" ]
    not_append = [entry for entry in entries if not 'append_to' in entry ]
    
    print(f'sections gathered for titles: custom: {custom}, regular_append: {regular_append}, not_append:{not_append} ')
    
    for entry in regular_append:
        name = entry['name'] if 'name' in entry else entry['append_to']
        score_label = entry['append_to'] if entry['append_to'] != "@none" else entry['label']
        insert_title_in_mei(mei_file, score_label, name)
            
    for entry in not_append:         
        name = entry['name'] if 'name' in entry else "Estribillo"
        score_section = entry['score_section'] if 'score_section' in entry else "estribillo"
        insert_title_in_mei(mei_file, score_section, name)
        
    for entry in custom:
        for section in get_sections_from_custom_append(entry['file']):
            insert_title_in_mei(mei_file, section, section)

        
            
            

def generate_score(order, data, tmp_dir, buildType):

    generated = []
    
    mei_unit = str(data['mei_unit']) if 'mei_unit' in data else "8.0"
    mei_scale = str(data['mei_scale']) if 'mei_scale' in data else "100"
    tmp_file = f"{tmp_dir}/tmp1.mei"
    generate_mei(data['meiFile'], order, data['text_author'], data['music_author'], data['title'], tmp_dir, tmp_file)
    add_titles(tmp_file, data['text'])

    shutil.copy(tmp_file, f'{tmp_dir}/final.mei')        

    if buildType is EditionType.PERFORMER:
        # Render the full version of all sections
        print("Generating performer full score")
        render_mei(tmp_file, mei_unit, mei_scale, tmp_dir, "full-score.pdf", False, True)
        return "full-score.pdf"
    elif buildType is EditionType.SCHOLAR:
        print("Generating scholar score with single verse and expanded annotations")
        single_verse_mei = f'{tmp_dir}/single-verse-sections.mei'
        shutil.copy(tmp_file, single_verse_mei)
        path = f"//mei:verse[@n!=\"1\"]"
        run_xmlstarlet(f"-d '{path}' {single_verse_mei}")
        blocks_to_inject = [entry for entry in data['text'] if 'append_to' in entry and entry['append_to'] != "@none" ]
        inject_section_place_holders(single_verse_mei, blocks_to_inject)   
        single_verse_pdf = f'single_verse_sections.pdf'
        render_mei(single_verse_mei, mei_unit, mei_scale, tmp_dir, single_verse_pdf, True, False)
        inject_text_into_place_holders(blocks_to_inject, f"{tmp_dir}/{single_verse_pdf}", tmp_dir)
        return single_verse_pdf
    else:
        return None


def generate_tono(data, status, tmp_dir, buildType):

    if 'meiFile' not in data or data['meiFile'] == "" or  data['meiFile'] == "null":
        return
        
    print(f"** Building tono {data['number']}: {data['title']} type: {buildType} **")

    directory = 'tonos/' + data['path']
        
    # convert filenames to full path        
    data = {key: directory + "/" + data[key]  if key in [ 'introductionFile', 'textCommentsFile', 'meiFile'] and data[key] != "" else data[key] for key in data.keys()}
    data['text'] = [{k: directory + "/" + v if k == "file" else v  for k, v in entry.items()}  for entry in data['text'] ]

    composer, lyricist = get_entries_from_mei(data['meiFile'])
    data['music_author'] = composer
    data['text_author'] = lyricist
    data['status_text'] = status['status_text']
    data['status_music'] = status['status_music']
    data['organic'] = status['organic']
    encoding = data['encodingProperties']
    data['high_clefs']  = encoding['originalArmor'] != encoding['encodedArmor']
        
    valuesLatexStr = ""
        
    files =  [data[key] for key in [ 'textCommentsFile', 'meiFile', 'introductionFile'] if key in data] + [ entry['file'] for entry in data['text']]
    vers = get_version_from_git(files)
    print(f"Version baseed on # of git revisions: {vers}")
        
    valuesLatexStr = valuesLatexStr + format_version(vers)
    valuesLatexStr = valuesLatexStr + format_titles(data['number'], data['title'], data['music_author'], data['text_author']) 
    valuesLatexStr = valuesLatexStr + format_edition(buildType)
    valuesLatexStr = valuesLatexStr + format_status(data)
    
    if PRE_RELEASE:
        valuesLatexStr = valuesLatexStr + "\\def\\prerelease{true}\n"
            
    latexStr = format_init()
    if 'introductionFile' in data and data['introductionFile'] != "" and data['introductionFile'] != "null":

        cmd = [ 'pandoc', Path(data['introductionFile']), '-o', f'{tmp_dir}/intro.tex']
        run_cmd(cmd)
        latexStr = latexStr + "\\section*{\\centering\\LARGE{Introducción}}\n"
        latexStr = latexStr + "\\input{intro.tex}" 
            
    latexStr = latexStr + format_text_part(
                            data['text'],
                            data['textCommentsFile'] if 'textCommentsFile' in data else None,
                            tmp_dir)
        
    generated_score = generate_score(data['number'], data, tmp_dir, buildType)
        
    latexStr = latexStr + "\\section*{Edición musical}\n"

    if buildType is EditionType.PERFORMER:
        latexStr = latexStr + "\\input{criterios-musicales-performer.tex}" 
    elif buildType is EditionType.SCHOLAR:
        latexStr = latexStr + "\\input{criterios-musicales-scholar.tex}" 

        
    if generated_score is not None:
        encoding = data['encodingProperties']
        json_params = json.dumps({ "organic" : data['organic'], "high_clefs" :  data['high_clefs'], "original_armor" : encoding['originalArmor'], "transposition" : encoding['encodedTransposition'], "encoded_armor" : encoding['encodedArmor'] })
        print(json_params)
        print("Generating comments from mei file")
        latexStr = latexStr + generate_comments_from_mei_file(data['meiFile'], json_params, tmp_dir, buildType)

    latexStr = latexStr + generate_audio_link(data, buildType)

    if generated_score is not None:
        latexStr = latexStr + "\\includepdf[pages=-]{%s/%s}\n" % (tmp_dir,generated_score)
        
    (Path(tmp_dir) / 'facsimil.tex').write_text(get_facsimil(data['facsimileItems']))
    latexStr = latexStr + "\\input{facsimil.tex}\n"
        
    
    latexStr = latexStr + "\\clearpage\n"
    latexStr = latexStr + "\\input{acerca.tex}\n"
    latexStr = latexStr +  "\\end{document}" 

        
    (Path(tmp_dir) / 'values.tex').write_text(valuesLatexStr)
    (Path(tmp_dir) / 'tmp.tex').write_text(latexStr)
        
    print("Rendering final pdf")
    render_latex(tmp_dir, 'tmp.tex')
        
    pdfname =  f'output/{str(data['number']).zfill(2)} - {data['title']} ({buildType.value}).pdf'
    meiname =  f'output/{str(data['number']).zfill(2)} - {data['title']}.mei'
        
    if generated_score is not None and (Path(tmp_dir) / 'final.mei').exists():
        shutil.copy(f'{tmp_dir}/final.mei', meiname)        
        print(f"MEI score: {meiname}")
        cmd = [ 'pdftk', f'{tmp_dir}/tmp.pdf', 'attach_files', meiname, 'to_page', 'end',  'output', pdfname]
        run_cmd(cmd)    
    else:
        shutil.move(f'{tmp_dir}/tmp.pdf', pdfname)      
                
    print("Tono generado: ")
    print(f"\t{pdfname}")
    print(f"\t{meiname}")

    os.makedirs("output", exist_ok=True)


def main():
 
    # Create temporary directory
    tmp_dir = tempfile.mkdtemp()

    with open(os.path.join("tonos", "tonos.json")) as f:
        config = json.load(f)
        scores = config['scores']
        for index,score in enumerate(scores):
            score['number'] = str(index + 1)


    with open(os.path.join("tonos", "status.json")) as f:
        status = json.load(f)
    
    try:
        if len(sys.argv) == 1:
            # Process all tonos
            for tono, tono_status in zip(scores, status):
                for buildType in list(EditionType):
                    print(f"Building tono {tono['number']} from dir {tono['path']}. Buildtype: {buildType}\n")
                    generate_tono(tono, tono_status, tmp_dir, buildType)
            for file in os.listdir(tmp_dir):
                os.remove(os.path.join(tmp_dir, file))
        elif len(sys.argv) == 2:
            tonoIdx = int(sys.argv[1]) - 1
            if tonoIdx >= 0 and tonoIdx < len(scores):
                for buildType in list(EditionType):
                    generate_tono(scores[tonoIdx], status[tonoIdx], tmp_dir, buildType)
            else:
                print(f"No such tono: {sys.argv[1]}")
        elif len(sys.argv) == 3:
            tonoIdx = int(sys.argv[1]) - 1
            buildType = EditionType(sys.argv[2])
            if tonoIdx >= 0 and tonoIdx < len(scores):
                generate_tono(scores[tonoIdx], status[tonoIdx], tmp_dir, buildType)
            else:
                print(f"No such tono: {sys.argv[1]}")
    finally:
        if not debug:
            shutil.rmtree(tmp_dir)
        else:
            print(f"Intermediate files kept at {tmp_dir}")

    

if __name__ == "__main__":
    main()

