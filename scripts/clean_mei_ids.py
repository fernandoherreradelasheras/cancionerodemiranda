import xml.etree.ElementTree as ET
import sys
import shutil

ID = '{http://www.w3.org/XML/1998/namespace}id'

PI_HREF = 'https://music-encoding.org/schema/5.0/mei-basic.rng'
PI_SCHEMA1 = 'http://relaxng.org/ns/structure/1.0'
PI_SCHEMA2 = 'http://purl.oclc.org/dsdl/schematron'

MEI_NS = 'http://www.music-encoding.org/ns/mei'

annotation_target_tags = [ f'{{{MEI_NS}}}corr', f'{{{MEI_NS}}}supplied', f'{{{MEI_NS}}}reg', f'{{{MEI_NS}}}unclear' ]

ET.register_namespace('', MEI_NS)

input_file = sys.argv[1]

top = ET.Element(None)
#top.append(ET.ProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"'))
top.append(ET.ProcessingInstruction(f'xml-model', f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA1}"'))
top.append(ET.ProcessingInstruction(f'xml-model', f'href="{PI_HREF}" type="application/xml" schematypens="{PI_SCHEMA2}"'))


target = ET.TreeBuilder (insert_comments=True, insert_pis=True)
parser = ET.XMLParser(target=target, encoding='utf-8')

tree = ET.parse(input_file, parser)
parent_map = {child: parent for parent in tree.iter() for child in parent}

idsReferenced = {value[1:] for elem in tree.iter() for name,value in elem.items() if value.startswith("#")}
print(f'Found {len(idsReferenced)} ids referenced that will be kept: {idsReferenced}')
idsLinked = {ref[1:] for elem in tree.iter() for name,value in elem.items() for ref in value.split(" ") if name == "plist"}
print(f'Found {len(idsLinked)} ids linked that will be kept: {idsLinked}')
idsWithParentAnnot = {elem.get(ID) for elem in tree.iter() if elem.get(ID) is not None and parent_map.get(elem) is not None and parent_map.get(elem).tag in annotation_target_tags}
print(f'Found {len(idsWithParentAnnot)} ids that could be target of expanded annotations and will be kepts: {idsWithParentAnnot}')
idsToKeep = idsReferenced | idsLinked | idsWithParentAnnot | { "FHH", "OMA" }

for e in [elem for elem in tree.iter() for item in elem.items() if item[0] == ID and item[1] not in idsToKeep]:
    e.attrib.pop(ID, None)

remaining_ids = {elem.get(ID) for elem in tree.iter() if elem.get(ID) is not None}
print(f'Found {len(remaining_ids)} remaining ids in document: {remaining_ids}')


elements_to_remove = []
for elem in tree.iter():
    if elem.tag in [f'{{{MEI_NS}}}tie', f'{{{MEI_NS}}}slur']:
        startid = elem.get('startid')
        endid = elem.get('endid')
        
        startid_valid = True
        endid_valid = True
        
        if startid:
            target_id = startid[1:] if startid.startswith('#') else startid
            if target_id not in remaining_ids:
                startid_valid = False
                
        if endid:
            target_id = endid[1:] if endid.startswith('#') else endid
            if target_id not in remaining_ids:
                endid_valid = False
        
        if not startid_valid or not endid_valid:
            elements_to_remove.append(elem)
            print(f'Marking {elem.tag} for removal - startid: {startid} (valid: {startid_valid}), endid: {endid} (valid: {endid_valid})')

removed_count = 0
for elem in elements_to_remove:
    parent = parent_map.get(elem)
    if parent is not None:
        parent.remove(elem)
        removed_count += 1

print(f'Removed {removed_count} tie/slur elements with invalid references')

root = tree.getroot()
root.set("xmlns", MEI_NS)
top.append(root)

newtree = ET.ElementTree(top)

ET.indent(newtree, space="", level=1)
ET.indent(tree, space="   ", level=0)

newtree.write(".tmp-clean.mei", xml_declaration=True, method="xml", encoding="UTF-8")

shutil.move(".tmp-clean.mei", input_file)

