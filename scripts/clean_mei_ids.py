import xml.etree.ElementTree as ET
import sys
import shutil

ID = '{http://www.w3.org/XML/1998/namespace}id'

PI_HREF = 'https://music-encoding.org/schema/5.0/mei-basic.rng'
PI_SCHEMA1 = 'http://relaxng.org/ns/structure/1.0'
PI_SCHEMA2 = 'http://purl.oclc.org/dsdl/schematron'

MEI_NS = 'http://www.music-encoding.org/ns/mei'

ET.register_namespace('', MEI_NS)

input_file = sys.argv[1]

top = ET.Element(None)
#top.append(ET.ProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'))
top.append(ET.ProcessingInstruction(f'xml-model', f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA1}"'))
top.append(ET.ProcessingInstruction(f'xml-model', f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA2}"'))


target = ET.TreeBuilder (insert_comments=True, insert_pis=True)
parser = ET.XMLParser(target=target, encoding='utf-8')

tree = ET.parse(input_file, parser)

idsReferenced = {value[1:] for elem in tree.iter() for name,value in elem.items() if value.startswith("#")}
print(f'Found {len(idsReferenced)} ids referenced that will be kept: {idsReferenced}')
idsLinked = {ref[1:] for elem in tree.iter() for name,value in elem.items() for ref in value.split(" ") if name == "plist"}
print(f'Found {len(idsLinked)} ids linked that will be kept: {idsLinked}')
idsToKeep = idsReferenced | idsLinked | { "FHH", "OMA" }
for e in [elem for elem in tree.iter() for item in elem.items() if item[0] == ID and item[1] not in idsToKeep]:
    e.attrib.pop(ID, None)


root = tree.getroot()
root.set("xmlns", MEI_NS)
top.append(root)

newtree = ET.ElementTree(top)

ET.indent(newtree, space="", level=1)
ET.indent(tree, space="   ", level=0)

newtree.write(".tmp-clean.mei", xml_declaration=True, method="xml", encoding="UTF-8")

shutil.move(".tmp-clean.mei", input_file)


