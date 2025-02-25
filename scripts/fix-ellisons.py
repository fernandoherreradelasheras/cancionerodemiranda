from lxml import etree as ET
import sys

MEI_NS = 'http://www.music-encoding.org/ns/mei'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {"mei" : MEI_NS, "xml": XML_NS}

def fix_syl(element, tokens):
    con = element.get('con')
    element.set('con', 'b')
    wordpos = element.get('wordpos')
    if wordpos == "i" or wordpos == "m":
        element.attrib.pop('wordpos', None)
    else:
        wordpos = None

    element.text = tokens[0]
    element.tail = element.tail
    parent = syl.getparent()
    for token in tokens[1:]:
        nsyl = ET.Element('syl')
        nsyl.text = token
        nsyl.tail = element.tail
        parent.append(nsyl)

    if wordpos is not None:
        if wordpos == 'i' or wordpos == 'm':
            nsyl.set('con', 'd')
            nsyl.set('wordpos', 'i')
        
    element.tail = element.tail + "   "

    


input_file = sys.argv[1]

ET.register_namespace("mei", MEI_NS)
ET.register_namespace("xml", XML_NS)

tree = ET.parse(input_file)

root = tree.getroot()

syls = root.iter(f'{{{MEI_NS}}}syl')
for syl in syls:
    if " " in syl.text:
        fix_syl(syl, syl.text.split(" "))
    elif " " in syl.text:
        fix_syl(syl, syl.text.split(" "))

f = open(input_file, 'wb')
f.write(ET.tostring(root, pretty_print=True,  encoding="utf-8"))
f.close()

