from lxml import etree as ET
import sys
from copy import deepcopy

MEI_NS = 'http://www.music-encoding.org/ns/mei'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
NSMAP = {"mei" : MEI_NS, "xml": XML_NS}

input_file1 = sys.argv[1]
input_file2 = sys.argv[2]

verses_to_merge = sys.argv[3].split(",")

output_file = sys.argv[4]

ET.register_namespace("mei", MEI_NS)
ET.register_namespace("xml", XML_NS)


tree1 = ET.parse(input_file1)
tree2 = ET.parse(input_file2)

root1 = tree1.getroot()
root2 = tree2.getroot()

measureCount1 = root1.xpath('count(//mei:measure)', namespaces=NSMAP)
measureCount2 = root2.xpath('count(//mei:measure)', namespaces=NSMAP)

if measureCount1 != measureCount2:
    print(f"Error: score 1 has {measureCount1} measures while score 2 has {measureCount2} measures")
    sys.exit(1)
    

staffCount1 = root1.xpath('count((//mei:scoreDef)[1]//mei:staffDef)', namespaces=NSMAP)
staffCount2 = root2.xpath('count((//mei:scoreDef)[1]//mei:staffDef)', namespaces=NSMAP)

if staffCount1 != staffCount2:
    print(f"Error: score 1 has {staffCount1} staves while score 2 has {staffCount2} staves")
    sys.exit(1)
    


measures1 = root1.xpath('//mei:measure', namespaces=NSMAP)
measures2 = root2.xpath('//mei:measure', namespaces=NSMAP)

    
for measure1, measure2 in zip(measures1, measures2):
    if measure1.get("n") != measure2.get("n"):
        print(f'Error while iterating over measures, got n="{measure1.get("n")}" for score 1 while score 2 was n="{measure2.get("n")}"')
        sys.exit(1)
        
    measureN = measure1.get("n")
    for staff1, staff2 in zip(measure1.iter(f'{{{MEI_NS}}}staff'), measure2.iter(f'{{{MEI_NS}}}staff')):
        staffN = staff1.get("n")
        for note1, note2 in zip(staff1.iter(f'{{{MEI_NS}}}note'), staff2.iter(f'{{{MEI_NS}}}note')):
            if note1 is None or note2 is None:
                print('Error. Different count of notes in staff')
                sys.exit(1)

            for verse1 in note1.iter(f'{{{MEI_NS}}}verse'):
                verseN = verse1.get("n")
                if verseN not in verses_to_merge:
                    continue
        
                replaceAt = None
                for verse2 in note2.iter(f'{{{MEI_NS}}}verse'):
                    n2 = verse2.get("n")
                    if int(n2) == int(verseN):
                        replaceAt = verse2
                        break
                    elif int(n2) > int(verseN):
                        break
            
                if replaceAt is None:
                    dest = ET.Element(f"verse")
                    dest.set('n', verseN)
                    dest.text = "\n                                 "
                    dest.tail = "\n                              "                
                    note2.append(dest)                
                else:
                    dest = replaceAt
                    for node in dest.iter(f'{{{MEI_NS}}}syl'):   
                        dest.remove(node)                    
                    dest.tail = dest.tail + "    "
        
        
                for syl in verse1.iter(f'{{{MEI_NS}}}syl'):
                    dest.append(deepcopy(syl))

            # Delete syls not on the score we are merging from
            for verse2 in note2.iter(f'{{{MEI_NS}}}verse'):
                verseN = verse2.get("n")
                if verseN not in verses_to_merge:
                    continue
                found = False
                for verse1 in note1.iter(f'{{{MEI_NS}}}verse'):
                    n1 = verse1.get("n")
                    if int(n1) == int(verseN):
                        found = True
                        break
                if not found:
                    verse2.getparent().remove(verse2)


        


        

            
  


f = open(output_file, 'wb')
f.write(ET.tostring(root2, pretty_print=True,  encoding="utf-8"))
f.close()

