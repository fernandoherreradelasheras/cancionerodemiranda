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


# Constants
MUSE = "MuseScore-Studio.AppImage"
PRE_RELEASE = 1
BASE_URL = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda"
debug=True

def log(message, tmp_dir):
    """Write message to debug log file"""
    with open(os.path.join(tmp_dir, "debug.log"), "a") as f:
        f.write(f"{message}\n")

def msg(message, tmp_dir):
    """Log message and print to stderr"""
    log(message, tmp_dir)
    print(message, file=sys.stderr)

def add_image(directory, page, caption, title=None):
    """Generate LaTeX code for including an image"""
    k = f"{page:03d}"
    lines = ["\\begin{figure}[p]"]
    
    if title:
        lines.append(f"\\section*{{\\centering\\LARGE{{{title}}}}}")
    
    lines.extend([
        f"\\caption{{{caption}}}",
        "\\makebox[\\linewidth]{",
        f"\\includegraphics[width=0.95\\linewidth]{{{directory}/image-{k}.jpg}}",
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
    cmd = ["pdflatex", "-interaction=batchmode", f"-output-directory={dir}", f"{dir}/{file}" ]
    run_cmd(cmd)

    
def run_cmd(cmd):
    try:
         print(subprocess.check_output(cmd).decode().strip())
    except Exception as e:
        print("Error running command: ")
        print(cmd)
        raise(e)
        
    

def format_version(version):
    return f"\\def\\myversion{{0.{version}}}\n"

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


def get_images(dir, pages, caption, title=""):
    output = ""
    print(pages)
    for page in pages:
        N = page - 1
        output = output + add_image(dir, N, caption, title)
        caption = ""
        title = ""
    return output
    
    
def get_facsimil(s1, s2, t, g):
    
    latexStr = get_images("facsimil-images/S1", s1, "Facsimil tiple 1", "Facsimiles")
    latexStr = latexStr + get_images("facsimil-images/S2", s2, "Facsimil tiple 2")
    latexStr = latexStr + get_images("facsimil-images/T", t, "Facsimil tenor")
    latexStr = latexStr + get_images("facsimil-images/G", g, "Facsimil guión")
 
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
        str = str + "\\noindent" 
        str = str + "\\input{text_comments.tex}" 

    return str

def generate_comments_from_mei_file(mei_file, json_params, tmp_dir):
    cmd = [ 'python',  './scripts/extract_comments_from_mei.py', mei_file, json_params, f'{tmp_dir}/music_comments.tex' ]
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

    print(contents)
    stanzas = contents.count('\n\n')
    lines = contents.count('\n') - stanzas
    print(f'section {section} -> lines: {lines}  stanzas: {stanzas}')
    return lines, stanzas

def run_xmlstarlet(cmd):
    cmd = "xmlstarlet ed -L -N mei=\"http://www.music-encoding.org/ns/mei\" " + cmd
    subprocess.check_output(['sh', '-c', cmd]).decode().strip()

def mei_has_more_than_1verse(file):
    cmd = ['xmlstarlet', 'sel', '-N', 'mei=http://www.music-encoding.org/ns/mei', '-t', '-v', 'count(//mei:verse[@n="2"])', file]
    return int(subprocess.check_output(cmd).decode().strip()) > 0
    


def insert_title_in_mei(mei_file, section, title):
    title = title.replace('_', ' ').capitalize()

    print(f"Injecting {section} heading {title} into the mei score")
    
    heading_section = f'{section}_heading'

    path = f"//mei:section[@label=\"{section}\"]" 
    run_xmlstarlet(f"-i '{path}' -t elem -n 'section label=\"{heading_section}\"' {mei_file}")
    

    path = f"//mei:section[@label=\"{heading_section}\"]"
    run_xmlstarlet(f"-s '{path}' -t elem -n 'div type=\"heading\"' {mei_file}")

    path = path + "/mei:div"
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

def find_and_remove_place_holder(section, pdf):
    
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

    doc.save("tmp-pdf.pdf")

    shutil.move("tmp-pdf.pdf", pdf)
    
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
        print(line)
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

    outputStr = outputStr + '\\documentclass{memoir}\n'
    outputStr = outputStr + '\\usepackage{paracol}\n'
    outputStr = outputStr + '\\usepackage[utf8]{inputenc}\n'
    outputStr = outputStr + '\\usepackage[top=%dcm,bottom=1cm,left=0.25cm,right=0.25cm]{geometry}\n' % math.floor(offset)
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
               
        (page, offset, pages) = find_and_remove_place_holder(injected_section, music_pdf)
        
        if page < 0:
            print(f'Cannot find placeholder for section {section} on the rendered pdf. Skipping text injection')
            return

	# Render a pdf with the text rendered at the position where the placeholder was in the score page
        outputname = f"stanzas_{section}"
        contents = get_contents_for_section(section, blocks_to_inject)
        
        first_stanza_end=contents.find("\n\n")
        contents = contents[first_stanza_end+2:-1]
        #print(f"contents: |{contents}|")
        
        latexStr = build_verses_overlay(offset, contents, section, 1)
        
        (Path(tmp_dir) / outputname).write_text(latexStr)
        
        render_latex(tmp_dir, outputname)
        
	# Extract the page from the score pdf where we want to overlay the pdf with the coplas
        overlay = f'{tmp_dir}/music_page_to_overlay.pdf'
        cmd = [ 'pdftk' , music_pdf, 'cat', str(page),  'output', overlay ]
        run_cmd(cmd)
        

	# Do the overlay operation
        cmd = [ 'pdftk' , overlay, 'background', f"{tmp_dir}/{outputname}.pdf",  'output', f'{tmp_dir}/music_with_stanzas.pdf' ]
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


def render_mei(mei_file, mei_unit, mei_scale, tmp_dir, output_name):
    cmd = [ 'sh', '-c', f'rm -f {tmp_dir}/*.svg' ]
    run_cmd(cmd)    

    cmd = [ 'verovio',  '--unit', mei_unit, '--multi-rest-style', 'auto', '--mdiv-all', '-a', '--mm-output', '--mnum-interval', '0',
            '--bottom-margin-header', '2.5', '--page-margin-left', '150', '--page-margin-right', '150', '--page-margin-top', '50',
           '--lyric-height-factor', '1.4', '--lyric-top-min-margin', '2.5', '--lyric-line-thickness', '0.2', "--no-justification",
            '--bottom-margin-header', '8', '--page-margin-bottom', '50', '--top-margin-pg-footer', '4',  '--header', 'auto', '--footer', 'encoded',
            '--breaks', 'auto', '--condense', 'auto', '--min-last-justification', '0.2', '--scale', mei_scale, '--scale-to-page-size', '--justify-vertically',
           '-o', f'{tmp_dir}/output.svg', mei_file ]
    print(" ".join(cmd))
    run_cmd(cmd)
    
    cmd = [ 'sh', '-c', f'svgs2pdf -m "{output_name}" -o "{tmp_dir}" {tmp_dir}/*.svg' ]
    run_cmd(cmd)    
  
    f = Path(tmp_dir) / 'output_001.pdf'
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

        
            
            

def generate_score(order, data, tmp_dir):

    generated = []
    
    if not 'mei_file' in data:
        return generated
    
    mei_unit = str(data['mei_unit']) if 'mei_unit' in data else "8.0"
    mei_scale = str(data['mei_scale']) if 'mei_scale' in data else "100"
    tmp_file = f"{tmp_dir}/tmp1.mei"
    
    generate_mei(data['mei_file'], order, data['text_author'], data['music_author'], data['title'], tmp_dir, tmp_file)
    add_titles(tmp_file, data['text_transcription'])
    shutil.copy(tmp_file, f'{tmp_dir}/final.mei')        

    if mei_has_more_than_1verse(tmp_file):
        render_mei(tmp_file, mei_unit, mei_scale, tmp_dir, "music-all-verses.pdf")
        generated.append("music-all-verses.pdf")

    path = f"//mei:verse[@n!=\"1\"]"
    run_xmlstarlet(f"-d '{path}' {tmp_file}")

    blocks_to_inject = [entry for entry in data['text_transcription'] if 'append_to' in entry and entry['append_to'] != "@none" ]
    inject_section_place_holders(tmp_file, blocks_to_inject)   
    render_mei(tmp_file, mei_unit, mei_scale, tmp_dir, "music-single-verse.pdf")   
    inject_text_into_place_holders(blocks_to_inject, f"{tmp_dir}/music-single-verse.pdf", tmp_dir)
    generated.append("music-single-verse.pdf")

    return generated


def main():
 
    # Create temporary directory
    tmp_dir = tempfile.mkdtemp()

    with open(os.path.join("tonos", "definitions.json")) as f:
        data = json.load(f)
    
    try:
        if len(sys.argv) == 2:
            tonoIdx = int(sys.argv[1]) - 1
            if tonoIdx >= 0 and tonoIdx < len(data):
                generate_tono(data[tonoIdx], tmp_dir)
            else:
                print(f"No such tono: {sys.argv[1]}")
        else:
            # Process all tonos
            for tono in data:
                print(f"Building tono {tono['number']} from dir {tono['path']}\n")
                generate_tono(tono, tmp_dir)
                for file in os.listdir(tmp_dir):
                    os.remove(os.path.join(tmp_dir, file))
    
    finally:
        if not debug:
            shutil.rmtree(tmp_dir)
        else:
            print(f"Intermediate files kept at {tmp_dir}")

def generate_tono(data, tmp_dir):
        
    print(f"** Building tono {data['number']}: {data['title']} **")

    directory = data['path']
        
    # convert filenames to full path        
    data = {key: directory + "/" + data[key]  if key in [ 'introduction', 'text_comments_file', 'music_comments_file', 'mei_file'] else data[key] for key in data.keys()}
    data['text_transcription'] = [{k: directory + "/" + v if k == "file" else v  for k, v in entry.items()}  for entry in data['text_transcription'] ]
        
    valuesLatexStr = ""
        
    files =  [data[key] for key in [ 'text_comments_file', 'music_comments_file', 'mei_file', 'introduction'] if key in data] + [ entry['file'] for entry in data['text_transcription']]
    vers = get_version_from_git(files)
    print(f"Version baseed on # of git revisions: {vers}")
        
    valuesLatexStr = valuesLatexStr + format_version(vers)
        
    valuesLatexStr = valuesLatexStr + format_titles(data['number'], data['title'], data['music_author'], data['text_author']) 
        
    valuesLatexStr = valuesLatexStr + format_status(data)
    
    if PRE_RELEASE:
        valuesLatexStr = valuesLatexStr + "\\def\\prerelease{true}\n"
            
    latexStr = format_init()
    if 'introduction' in data:

        cmd = [ 'pandoc', Path(data['introduction']), '-o', f'{tmp_dir}/intro.tex']
        run_cmd(cmd)
        latexStr = latexStr + "\\section*{\\centering\\LARGE{Introducción}}\n"
        latexStr = latexStr + "\\input{intro.tex}" 
            
    latexStr = latexStr + format_text_part(
                            data['text_transcription'],
                            data['text_comments_file'] if 'text_comments_file' in data else None,
                            tmp_dir)
        
    generated_scores = generate_score(data['number'], data, tmp_dir)
        
    latexStr = latexStr + "\\section*{Edición musical}\n"
    latexStr = latexStr + "\\input{criterios-musicales.tex}" 
        
    if len(generated_scores) > 0:
        if 'music_comments_file' in data:
            print(f"Adding music comments from file {data['music_comments_file']}")
            latexStr = latexStr + Path(data['music_comments_file']).read_text()
        else:
            json_params = json.dumps({ "organic" : data['organic'], "high_clefs" :  data['high_clefs'], "original_armor" : data['original_armor'], "transposition" : data['transposition'], "encoded_armor" : data['encoded_armor'] })
            print(json_params)
            latexStr = latexStr + generate_comments_from_mei_file(data['mei_file'], json_params, tmp_dir)
            
        for score in generated_scores:
            latexStr = latexStr + "\\includepdf[pages=-]{%s}\n" % score
        
    (Path(tmp_dir) / 'facsimil.tex').write_text(get_facsimil(data['s1_pages'], data['s2_pages'], data['t_pages'], data['g_pages']))
    latexStr = latexStr + "\\input{facsimil.tex}\n"
        
    
    latexStr = latexStr + "\\clearpage\n"
    latexStr = latexStr + "\\input{acerca.tex}\n"
    latexStr = latexStr +  "\\end{document}" 

        
    (Path(tmp_dir) / 'values.tex').write_text(valuesLatexStr)
    (Path(tmp_dir) / 'tmp.tex').write_text(latexStr)
        
    print("Rendering final pdf")
    render_latex(tmp_dir, 'tmp.tex')
        
    destname =  f'output/{str(data['number']).zfill(2)} - {data['title']}'
        
    if len(generated_scores) > 0 and (Path(tmp_dir) / 'final.mei').exists():
        shutil.copy(f'{tmp_dir}/final.mei', f'{destname}.mei')        
        print(f"MEI score: {destname}.mei")
        cmd = [ 'pdftk', f'{tmp_dir}/tmp.pdf', 'attach_files', f'{destname}.mei', 'to_page', 'end',  'output', f'{destname}.pdf']
        run_cmd(cmd)    
    else:
        shutil.move(f'{tmp_dir}/tmp.pdf', f'{destname}.pdf')      
                
        
    print(f"Tono generado: {destname}.pdf")


        
        
                    




    
    # Extract necessary information from JSON
    # ... (implement the rest of the generation logic)
    
    # Create output directory if it doesn't exist
    os.makedirs("output", exist_ok=True)
    
    # Generate the final PDF
    # ... (implement PDF generation logic)

if __name__ == "__main__":
    main()

