import xml.etree.ElementTree as ET
import sys

namespaces = {'mei': 'http://www.music-encoding.org/ns/mei'} 
ID = '{http://www.w3.org/XML/1998/namespace}id'

ET.register_namespace('', 'http://www.music-encoding.org/ns/mei')

file = sys.argv[1]

top = ET.Element(None)
top.append(ET.ProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'))
top.append(ET.ProcessingInstruction('xml-model', 'href="https://music-encoding.org/schema/5.0/mei-basic.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"'))
top.append(ET.ProcessingInstruction('xml-model', 'href="https://music-encoding.org/schema/5.0/mei-basic.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"'))


target = ET.TreeBuilder (insert_comments=True, insert_pis=True)
parser = ET.XMLParser(target=target, encoding='utf-8')

tree = ET.parse(file, parser)

idsReferenced = {value[1:] for elem in tree.iter() for name,value in elem.items() if value.startswith("#")}
print(f'Found {len(idsReferenced)} ids referenced that will be kept: {idsReferenced}')
for e in [elem for elem in tree.iter() for item in elem.items() if item[0] == ID and item[1] not in idsReferenced]:
    e.attrib.pop(ID, None)


root = tree.getroot()
root.set("xmlns", "http://www.music-encoding.org/ns/mei")
top.append(root)

newtree = ET.ElementTree(top)

ET.indent(newtree, space="", level=1)
ET.indent(tree, space="   ", level=0)
newtree.write("clean.mei", xml_declaration=False, method="xml", encoding="UTF-8")


