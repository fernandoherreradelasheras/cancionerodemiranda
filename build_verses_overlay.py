import sys
import math

offset = float(sys.argv[1])
verses = sys.argv[2]

stanzas=[]
currentStanza=[]
longestverses=[]
currentLongestVerse=""

for verse in verses.splitlines():
    if verse == "":
        stanzas.append(currentStanza)
        longestverses.append(currentLongestVerse)
        currentStanza=[]
    else:
        currentStanza.append(verse)
        if len(verse) > len(currentLongestVerse):
            currentLongestVerse=verse

stanzas.append(currentStanza)
longestverses.append(currentLongestVerse)

colbreak = len(stanzas) // 3


print('\\documentclass{memoir}')
print('\\usepackage{paracol}')
print('\\usepackage[utf8]{inputenc}')
print('\\usepackage[top=%dcm,bottom=1cm,left=0.25cm,right=0.25cm]{geometry}' % math.floor(offset))
print('\\pagenumbering{gobble}')
print('\\begin{document}')
print('\\poemtitle{Coplas}')
print('\\begin{paracol}{3}')

for stanza_idx, stanza in enumerate(stanzas): 

    if colbreak > 0 and stanza_idx > 0 and stanza_idx % colbreak == 0:
        print('\\switchcolumn')

    print('\\settowidth{\\versewidth}{%s}' % longestverses[stanza_idx])
    print('\\begin{verse}')

    for verse_idx,verse in enumerate(stanza):
        if verse_idx == 0:
            print('\\textbf{%d.}\\\\' % (stanza_idx + 2))
        print('%s\\\\' % verse)
    print('\\end{verse}')

print('\\end{paracol}')
print('\\end{document}')



