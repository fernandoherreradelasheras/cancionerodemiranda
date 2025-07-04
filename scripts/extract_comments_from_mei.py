from lxml import etree as ET
import json
import sys

MEI_NS = 'http://www.music-encoding.org/ns/mei'
NSMAP = {"mei" : MEI_NS}

EDITORIAL_ELEMENTS = [ "corr", "sic", "choice", "unclear", "supplied", "reg", "app" ]


def build_note(measure, partName, annotText, type):
    return {"measure": measure, "partName": partName, "type": type, "annotText": annotText}

def dots(element):
    return " con puntillo" if "dots" in element.attrib and element.attrib["dots"] == "1" else ""

def describe(element):
    if element.tag == f'{{{MEI_NS}}}note':
        #TODO: accid
        return f' {element.attrib["pname"]}{element.attrib["oct"]} ({element.attrib["dur"]}){dots(element)}'
    elif element.tag == f'{{{MEI_NS}}}mRest':
        return f' silencio todo el compás'
    elif element.tag == f'{{{MEI_NS}}}rest':
        return f' silencio ({element.attrib["dur"]}){dots(element)}'
    elif element.tag == f'{{{MEI_NS}}}syl':
        return element.text # TODO: search parent and tell below which note and verse this is
    elif element.tag == f'{{{MEI_NS}}}staff':
        text = ""
        elements = element.xpath('./mei:layer/mei:*', namespaces=NSMAP)
        for e in elements:
            text = text + describe(e)
        return text
    elif element.tag == f'{{{MEI_NS}}}verse':
        text = f"Estrofa {element.attrib["n"]}: "
        syls = element.xpath('./mei:syl', namespaces=NSMAP)
        for s in syls:
            text = text + s.text
        return text

    elif element.tag == f'{{{MEI_NS}}}reg':
        text = "Regularización:"
        elements = element.xpath('./mei:*', namespaces=NSMAP)
        for e in elements:
            text = text + describe(e)
        return text
    elif element.tag == f'{{{MEI_NS}}}orig':
        text = "Original:"
        elements = element.xpath('./mei:*', namespaces=NSMAP)
        for e in elements:
            text = text + describe(e)
        return text


    else:
        print("unhandled element :" + element.tag)
        return None



def build_app_note(app, measure, partName, annotText):
    label =  app.xpath('./mei:lem/@label', namespaces=NSMAP)
    if label and label[0] == "app_clefs":
        print("Ignoring app_clefs")
        return None

    text = "Otras lecturas."
    rdgs =  app.xpath('./mei:rdg/mei:*', namespaces=NSMAP)
    print(rdgs)
    for i, rdg in enumerate(rdgs):
        text = text + f' Lectura {i+1}:{describe(rdg)}'

    return {"measure": measure, "partName": partName, "type": "app", "annotText": text}

def build_choice_note(choice, measure, partName, annotText):
    text = "Varias opciones. "
    choices =  choice.xpath('./mei:*', namespaces=NSMAP)
    for i, e in enumerate(choices):
        print(e.tag)
        text = text + f' Opcion {i+1}:{describe(e)}{" (mostrada)" if i == 0 else ""}' 

    return {"measure": measure, "partName": partName, "type": "app", "annotText": text}
    
 
    
    
    
def get_staffN_for_clef(clef):
    staffDeff = clef.getparent()
    return staffDeff.get("n")
    
def get_part_name_for_clef(partNames, clef):
    n = get_staffN_for_clef(clef)
    return partNames[n]
    
def clefName(shape):
    if shape == "C":
        return "Do"
    elif shape == "G":
        return "Sol"
    elif shape == "F":
        return "Fa"
    
def format_keysig(keysig):
    if keysig == "1f":
        return "un bemol"
    elif keysig == "1s":
        return "un sostenido"
    else: 
        return "sin alteraciones"

    
    
def get_part_names(root):
    map = {}
    staffDefs = root.xpath('(//mei:scoreDef)[1]//mei:staffDef', namespaces=NSMAP)
    for staffDef in staffDefs:
        n = staffDef.get("n")
        label = staffDef.find("mei:label",  namespaces=NSMAP)
        if n is not None and label is not None:
            map[n] = label.text
    return map

def get_orig_clefs(root, partNames):
    res = root.xpath('(//mei:mdiv//mei:section//mei:rdg[@label="app_clefs"])[1]//ancestor::mei:app/@xml:id', namespaces=NSMAP)
    if res is None or len(res) <= 0:
        return
    appId = res[0]

    res = root.xpath('//mei:annot[starts-with(@plist, "#%s")]' % appId, namespaces=NSMAP)
    if res is None or len(res) <= 0:
        return
    annot = res[0]
    
    rdg_clefs = root.xpath('(//mei:mdiv//mei:section//mei:rdg[@label="app_clefs"])[1]//mei:clef', namespaces=NSMAP)
    if rdg_clefs is None or len(rdg_clefs) <= 0:
        return

    orig_clefs = []
    if "plist" in annot.keys():
        for ref in annot.get("plist").split(" ")[1:]:
            clef = next((c for c in rdg_clefs if c.get("corresp") == ref), None)
            if clef is not None:
                orig_clefs.append(clef)
            
    res = []
    all_clefs = orig_clefs + [clef for clef in rdg_clefs if clef not in orig_clefs]
    
    all_clefs.sort(key=lambda c: int(get_staffN_for_clef(c)))
   
    for clef in all_clefs:    
        res.append(f'{get_part_name_for_clef(partNames, clef)}: {clefName(clef.get("shape"))} en {clef.get("line")}ª')

    return ", ".join(res)

def get_editorial_notes(root):
    editorial_notes = []
    annots = root.xpath('//mei:annot', namespaces=NSMAP)
    for annot in annots:
        if "plist" not in annot.keys():
            continue
        for id in [target[1:] for target in annot.get("plist").split(" ")]:
            res =  root.xpath('//*[@xml:id="%s"]' % id, namespaces=NSMAP)
            if len(res) > 0:
                e = res[0]
                measureN = 0
                res = root.xpath('//*[@xml:id="%s"]/ancestor::mei:measure/@n' % id, namespaces=NSMAP)
                if len(res) > 0:
                    measureN = res[0]
                else:
                    res = root.xpath('//*[@xml:id="%s"]/mei:measure/@n' % id, namespaces=NSMAP)
                    if len(res) > 0:
                        measureN = res[0]                    
                                
                res = root.xpath('//*[@xml:id="%s"]/ancestor::mei:staff/@n' % id, namespaces=NSMAP)
                if len(res) <= 0:
                    staffN = 0
                    partName = ""
                else:        
                    staffN = res[0]
                    partName = partNames[staffN]
                                
                editorialType = [ed for ed in EDITORIAL_ELEMENTS if f'{{{MEI_NS}}}{ed}' == e.tag]
                if len(editorialType) > 0:
                    #TODO: extractor for choice
                    if editorialType[0] == "app":
                        appNote = build_app_note(e, measureN, partName, annot.text)
                        if appNote:
                            editorial_notes.append(appNote)
                        break
                    elif editorialType[0] == "choice":
                        choiceNote = build_choice_note(e, measureN, partName, annot.text)
                        print(choiceNote)
                        if choiceNote:
                            editorial_notes.append(choiceNote)
                        break
                    else:
                        editorial_notes.append(build_note(measureN, partName, annot.text, editorialType[0]))
                        break
                            

    return editorial_notes




input_file = sys.argv[1]
json_info = json.loads(sys.argv[2])
extractAnnotations = True if sys.argv[3] == "--extractAnnotations" else False
output_file = sys.argv[4] if len(sys.argv) == 5 else None


tree = ET.parse(input_file)
root = tree.getroot()
ET.register_namespace("mei", MEI_NS)

partNames = get_part_names(root)
orig_clefs = get_orig_clefs(root, partNames)

editorial_notes = get_editorial_notes(root) if extractAnnotations else None


if output_file:
    f = open(output_file, 'w')
    f.write("\\subsection*{Datos musicales}\n\n")
    f.write("\\noindent \\textbf{Orgánico}: %s\\\\\n"
            % json_info['organic'])
    f.write("\\textbf{%s}: %s.\\\\\n"
            % ("Claves altas" if json_info['high_clefs'] else "Claves bajas", orig_clefs))
    f.write("\\textbf{Armadura}: %s\\\\\n"
            % format_keysig(json_info['original_armor']))
    f.write("\\textbf{Transcripción}: a claves modernas %s%s\n\n"
                % ("transpuestas una cuarta hacia abajo" if json_info['transposition'] == "-P4" else "sin transposición",
                   ", armadura resultante: " + format_keysig(json_info['encoded_armor']) if json_info['transposition'] else ""))
    if editorial_notes is not None and len(editorial_notes) > 0:
        print(f"Editorial notes: {len(editorial_notes)}")
        f.write("\\subsection*{Notas a la edición musical}\n\n")
        f.write("\\noindent")
        for note in editorial_notes:
            f.write("\\textbf{Compás %s%s}: %s\\\\\n" % (note['measure'] if 'measure' in note else "0",
                                                        f', {note['partName']}' if note['partName'] != "" else "",
                                                        note['annotText']))
    f.write("\n\n")
    f.close()
else:
    print(json.dumps({ "original_clefs": orig_clefs, "annotations": editorial_notes }))



