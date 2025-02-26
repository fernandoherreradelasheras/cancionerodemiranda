import { VerovioToolkit } from "verovio/esm"
import { Option, EditorialItem, Annotation } from "./Editorial"


const nsResolver = (ns: string) => { return { mei: "http://www.music-encoding.org/ns/mei", xml: "http://www.w3.org/XML/1998/namespace" }[ns] }


export const maxVerseNum = (doc: Document) => {
    //@ts-ignore
    let matches = doc?.evaluate("//mei:verse/@n", doc, nsResolver, XPathResult.ANY_TYPE, null)
    var max = 0
    let node 
    while ((node = matches?.iterateNext())) {
        let value = parseInt(node.nodeValue || "0")
        if (value > max) {
            max = value
        }        
    }
    return max
}

const getFictaAccidIterator = (doc: Document) => 
    //@ts-ignore
    doc?.evaluate('//mei:accid[@func="edit"]', doc, nsResolver, XPathResult.ANY_TYPE, null)

export const hasFictaElements = (doc: Document) => {
    const it = getFictaAccidIterator(doc)
    return it.iterateNext() != null
} 


export const midiBpm = (doc: Document) => {
    //@ts-ignore
    let bpm = doc?.evaluate("//mei:scoreDef[1]/@midi.bpm", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return parseInt(bpm)
}

export const getNoteDur = (doc: Document, id: string) => {
    //@ts-ignore
    let dur = doc?.evaluate(`//mei:note[@xml:id="${id}"]/@dur`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return dur
}

export const getNoteStaff = (doc: Document, id: string) => {
    //@ts-ignore
    let n = doc?.evaluate(`//mei:note[@xml:id="${id}"]/ancestor::mei:staff/@n`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return n
}

export const getSectionLabels = (doc: Document) => {
    const labels = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:section[@label]/@label`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    var label = matches.iterateNext()
    while (label != null) {
        labels.push(label)
        label = matches.iterateNext()
    }
    return labels
}

export const getPageForMeasureN = (doc: Document, verovio: VerovioToolkit, n: number) => {
    //@ts-ignore
    let xmlid = doc?.evaluate(`//mei:measure[@n="${n}"]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return verovio?.getPageWithElement(xmlid)
}

export const getFirstMeasureN = (doc: Document) => {
    //@ts-ignore
    let xmlid = doc?.evaluate(`(//mei:measure)[1]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return xmlid
}

export const getPageForSection = (doc: Document, verovio: VerovioToolkit, section: string) => {
    //@ts-ignore
    let xmlid = doc?.evaluate(`//mei:section[@label="${section}"]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return  verovio?.getPageWithElement(xmlid)
}

export const getNumMeasures = (doc: Document) => {
    //@ts-ignore
    let lastMeasureN = doc?.evaluate(`(//mei:measure)[last()]/@n`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return lastMeasureN
}

export const getEditor = (doc: Document) => {
    //@ts-ignore
    let name = doc?.evaluate("//mei:respStmt/mei:persName[@role=\"transcriber\"][1]", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.textContent
    return name
}

const getEditorialNodesOfType = (doc: Document, type: string) =>  {
    const items : EditorialItem[] = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:${type}`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        if (node.parentElement?.tagName != "choice" && node.parentElement?.tagName != "app") {
            const element = node as Element 
            const id = element.getAttribute("xml:id")    
            const reason = element.getAttribute("reason")
            const resp = element.getAttribute("resp")        
            items.push({ id: id!!, reason: reason || "", resp : resp || "", type: type, boundingBox: null, annotations: new Set() })
        }
        node = matches.iterateNext()
    }
    return items
}

const getChoiceNodesOfType = (doc: Document, type: string) =>  {
    const items : EditorialItem[] = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:${type}`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        const element = node as Element 
        const choiceId = element.getAttribute("xml:id")  
        const options : Option[] = []
        const choice = { id: choiceId!!, options: options, selectedOptionIdx: 0}
        
        for (let child of [...node.childNodes?.values()].filter(n => n.nodeType == Node.ELEMENT_NODE)) {
            const choiceElement = child as Element 
            const optionLabel = choiceElement.getAttribute("label")  
            const nodeType = choiceElement.tagName
            if (type == "app" && nodeType == "lem") {
                choice.selectedOptionIdx = choice.options.length
            }  // For choice elements, the first one is the default
            choice.options.push({ type: nodeType, selector: `./${nodeType}[@label='${optionLabel}']` })
        }     

        items.push({ id: choiceId!!, type: type, resp: "", reason: "", boundingBox: null, choice: choice, annotations: new Set() })   
        node = matches.iterateNext()
    }    
    return items
}


const getAnnotations = (doc: Document) =>  {
    const annotations : Annotation[] = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:annot`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        const element = node as Element
        const annotId = element.getAttribute("xml:id")     
        const text = [...element.childNodes?.values()].filter(n => n.nodeType == Node.TEXT_NODE).map((n) => n.textContent).join("\n")     
        const targetIds = element.getAttribute("plist")?.split(" ").map(ref => ref.replace("#", ""))
        annotations.push({id: annotId!, text: text, targetIds: targetIds! })
        node = matches.iterateNext()
    }
    return annotations
}



export const getEditorial = (doc: Document) : EditorialItem[] => {
    const editorialElements: EditorialItem[] = 
        getEditorialNodesOfType(doc, "unclear")
        .concat(getEditorialNodesOfType(doc, "sic"))
        .concat(getEditorialNodesOfType(doc, "corr"))
        .concat(getEditorialNodesOfType(doc, "supplied"))
        .concat(getEditorialNodesOfType(doc, "reg"))
        .concat(getChoiceNodesOfType(doc, "choice"))        
        .concat(getChoiceNodesOfType(doc, "app"))


    const annotations = getAnnotations(doc)
    const consumedAnnotationsTargets = new Set()

    editorialElements.forEach(e => {
        const annot = annotations.find(a => a.targetIds.includes(e.id))
        if (annot) {
            e.annotations.add(annot)
            consumedAnnotationsTargets.add(e.id)
        }
    })

    // Create EditorialElements for those ids that were target of an annotation but are not covered by 
    // any other EditorialElement
    annotations.forEach(annot => {
        const unusedIds = annot.targetIds.filter(id => !consumedAnnotationsTargets.has(id))
          
        if (unusedIds.length > 0) {
            const elementsForAnnotation = editorialElements.filter(e => e.annotations.has(annot))
            if (elementsForAnnotation.length == 1) {
                // Append the ids referenced by the annotation as @corres
                elementsForAnnotation[0].correspIds = [...unusedIds]
            } else {
                console.log(`Cannot add the targetIds ${unusedIds}`)
            }
        }        
    }) 

   return editorialElements
}

export const getTargettableChildren = (doc: Document, id: string) => {
    const ids = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:*[@xml:id="${id}"]//mei:staff`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        ids.push((node as Element).getAttribute("xml:id"))
        node = matches.iterateNext()
    }
    return ids

}

export const filterScoreToNVerses = (score: string, numVerses: number) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(score, "application/xml")
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:verse[@n > "${numVerses}"]`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    if (matches == null) {
        return score
    }
    const nodes = []
    var node = matches.iterateNext()
    while (node != null) {
        nodes.push(node)
        node = matches.iterateNext()
    }
    nodes.forEach(n => n.parentElement?.removeChild(n))

    const s = new XMLSerializer();
    return s.serializeToString(doc);
}


export const filterScoreNormalizingFicta = (score: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(score, "application/xml")
    const fictacAccidIter = getFictaAccidIterator(doc)

    if (fictacAccidIter == null) {
        return score
    }

    const nodes = []
    var node = fictacAccidIter.iterateNext()
    while (node != null) {
        nodes.push(node as Element)
        node = fictacAccidIter.iterateNext()
    }

    nodes.forEach(n => {
        n.removeAttribute("func")
        n.removeAttribute("enclose")
    })

    const s = new XMLSerializer();
    return s.serializeToString(doc);
}



export const scoreAddTitles = (score: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(score, "application/xml")
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:section[@label]/@label`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node;
    const labels = []
    while ((node = matches?.iterateNext())) {
                if (node.nodeValue != null && node.nodeValue.indexOf("_heading") < 0) {
            labels.push(node.nodeValue)
        }
    }

    // Only write titles if we have more than one section
    if (labels.length <= 1) {
        return score
    }
    var modified = false
    labels.forEach(label => {
        //@ts-ignore
        let measure = doc?.evaluate(`//mei:section[@label="${label}"]/mei:measure[1]`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()
        if (measure == null) {
            return
        }
        modified = true
        const title = (label.charAt(0).toUpperCase() + label.slice(1)).replace(/_/g, " ")
        const dir = doc.createElement("dir")    
        dir.setAttribute("place", "above")
        dir.setAttribute("staff", "1")
        dir.setAttribute("tstamp", "0")         
        measure?.insertBefore(dir, measure.firstChild)
        const rend = doc.createElement("rend")
        rend.setAttribute("fontstyle", "normal")
        rend.setAttribute("fontweight", "bold")
        dir.appendChild(rend)
        const text = doc.createTextNode(title)
        rend.appendChild(text)
    })


    if (modified) {
        const s = new XMLSerializer();
        return s.serializeToString(doc);
    } else {
        return score
    }
}


