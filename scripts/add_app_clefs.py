from lxml import etree as ET
import sys

MEI_NS = 'http://www.music-encoding.org/ns/mei'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {"mei" : MEI_NS, "xml": XML_NS}

input_file = sys.argv[1]
output_file = sys.argv[2]


tree = ET.parse(input_file)

root = tree.getroot()

ET.register_namespace("mei", MEI_NS)
ET.register_namespace("xml", XML_NS)

scoreDef = root.xpath('(//mei:scoreDef)[1]', namespaces=NSMAP)[0]
print(scoreDef)

section = root.xpath('(//mei:section)[1]', namespaces=NSMAP)[0]

newDef = ET.fromstring(ET.tostring(scoreDef))
newDef.tail = section.tail + "         "
newDef.text = section.text + "         "
for child in newDef.iter(f'{{{MEI_NS}}}staffGrp', f'{{{MEI_NS}}}staffDef'):
    if child.text is not None:
        child.text = child.text + "         "
        child.tail = child.tail + "         "
for child in newDef.iter(f'{{{MEI_NS}}}label', f'{{{MEI_NS}}}labelAbbr', f'{{{MEI_NS}}}clef'):
    if child.tail is not None:
        child.tail = child.tail + "         "


clefsOrig = list(scoreDef.iter(f'{{{MEI_NS}}}clef'))
C = 1
for clef in clefsOrig:
    clef.set(f'{{{XML_NS}}}id', f'cjkdud{C}')
    C = C + 1

clefsCopied = list(newDef.iter(f'{{{MEI_NS}}}clef'))
C = 1
for clef in clefsCopied:
    clef.set(f'copyof', f'#cjkdud{C}')
    C = C + 1

app = ET.Element(f"app")
app.set(f'{{{XML_NS}}}id', "acdkjf9")
app.text = section.text + "   "
app.tail = section.tail + "      "
section.insert(0,app)

lem = ET.Element(f"lem")
lem.set(f'label', "app_clefs")
lem.tail = app.text
app.append(lem)

rdg = ET.Element(f"rdg")
rdg.set(f'label', "app_clefs")
rdg.text = app.text + "   "
rdg.tail = app.tail
app.append(rdg)

rdg.append(newDef)


annot = ET.Element(f"annot")
annot.set(f'plist', "#acdkjf9 #cjkdud3 #cjkdud4")
annot.text = "Claves modernizadas"
annot.tail = app.tail
section.insert(1, annot)


f = open(output_file, 'wb')
f.write(ET.tostring(root, pretty_print=True,  encoding="utf-8"))
f.close()

