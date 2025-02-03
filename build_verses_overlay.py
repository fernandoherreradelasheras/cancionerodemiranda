import sys
import math

offset = float(sys.argv[1])
file = sys.argv[2]
section = sys.argv[3]

stanzas = []
currentStanzaNumber = 0
readingStanza=False

verses = []
longestverses = []
currentLongestVerse = ""

lines = open(file, "r").read().splitlines()

for idx,line in enumerate(lines + [""]):
    if line == "":
        currentStanzaNumber = currentStanzaNumber + 1
        if readingStanza:
            stanzas.append({'stanzaNumber': currentStanzaNumber, 'verses': verses})
            longestverses.append(currentLongestVerse)
            verses = []
            if section != "coplas":
                readingStanza = False 
        elif section == "coplas": # section "coplas" will catch all "unnotated" ones but but the first 
            readingStanza = True
    elif line.startswith('%append_to_score_section='):
        readingStanza = True if line == f'%append_to_score_section={section}' else False
    elif readingStanza:
        verses.append(line)
        if len(line) > len(currentLongestVerse):
            currentLongestVerse=line

stanzasCount = len(stanzas)
colbreak = stanzasCount // 3 if len(stanzas) > 3 else 1

print('\\documentclass{memoir}')
print('\\usepackage{paracol}')
print('\\usepackage[utf8]{inputenc}')
print('\\usepackage[top=%dcm,bottom=1cm,left=0.25cm,right=0.25cm]{geometry}' % math.floor(offset))
print('\\pagenumbering{gobble}')
print('\\begin{document}')
#print('\\poemtitle{%s}' % title)
print('\\begin{paracol}{3}')

for stanza_idx, stanza in enumerate(stanzas): 

    if colbreak > 0 and stanza_idx > 0 and stanza_idx % colbreak == 0:
        print('\\switchcolumn')

    print('\\settowidth{\\versewidth}{%s}' % longestverses[stanza_idx])
    print('\\begin{verse}')

    for verse_idx,verse in enumerate(stanza['verses']):
        if verse_idx == 0:
            print('\\textbf{%d.}\\\\' % stanza['stanzaNumber'])
        print('%s\\\\' % verse)
    print('\\end{verse}')

print('\\end{paracol}')
print('\\end{document}')



