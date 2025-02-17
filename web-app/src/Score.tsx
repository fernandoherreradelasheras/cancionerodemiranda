import { VerovioToolkit } from "verovio/esm"
import { Annotation, EditorialItem } from "./Editorial"


const nsResolver = (ns: string) => { return { mei: "http://www.music-encoding.org/ns/mei", xml: "http://www.w3.org/XML/1998/namespace" }[ns] }


export const maxVerseNum = (doc: Document) => {
    //@ts-ignore
    let maxN = doc?.evaluate("//mei:verse/@n[not(. < ../../mei:verse/@n)][1]", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return maxN
}

//@ts-ignore
export const midiBpm = (doc: Document) => {
    //@ts-ignore
    let bpm = doc?.evaluate("//mei:scoreDef[1]/@midi.bpm", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return parseInt(bpm)
}

//@ts-ignore
export const getNoteDur = (doc: Document, id: string) => {
    //@ts-ignore
    let dur = doc?.evaluate(`//mei:note[@xml:id="${id}"]/@dur`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return dur
}

//@ts-ignore
export const getNoteStaff = (doc: Document, id: string) => {
    //@ts-ignore
    let n = doc?.evaluate(`//mei:note[@xml:id="${id}"]/ancestor::mei:staff/@n`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return n
}

export const getPageForMeasureN = (doc: Document, verovio: VerovioToolkit, n: number) => {
    //@ts-ignore
    let xmlid = doc?.evaluate(`//mei:measure[@n="${n}"]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return verovio?.getPageWithElement(xmlid)
}

export const getPageForSection = (doc: Document, verovio: VerovioToolkit, section: string) => {
    //@ts-ignore
    let xmlid = doc?.evaluate(`//mei:section[@label="${section}"]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    return  verovio?.getPageWithElement(xmlid)
}

export const getNumMeasures = (doc: Document) => {
    //@ts-ignore
    let lastMeasureN = doc?.evaluate(`(//mei:measure)[last()]/@n`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
    console.log(lastMeasureN)
    return lastMeasureN
}

export const getEditor = (doc: Document) => {
    //@ts-ignore
    let name = doc?.evaluate("//mei:respStmt/mei:name[1]", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.textContent
    console.log(name)
    return name
}

const getNodesOfType = (doc: Document, type: string) =>  {
    const items = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:${type}`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        if (node.parentElement?.tagName != "choice") {
            const element = node as Element 
            const id = element.getAttribute("xml:id")    
            const reason = element.getAttribute("reason")
            const resp = element.getAttribute("resp")        
            const targetIds = [...node.childNodes?.values()].filter(n => n.nodeType == Node.ELEMENT_NODE).map((n: any) => n.getAttribute("xml:id"))  
            
            const item : EditorialItem = { id: id!!, reason: reason || "", resp : resp || "", type: type, boundingBox: null, targetIds: targetIds }
            items.push(item)
        }
        node = matches.iterateNext()
    }
    return items
}

export const getAnnots = (doc: Document) =>  {
    const annots = []
    //@ts-ignore
    let matches = doc?.evaluate(`//mei:annot`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    let node = matches.iterateNext()
    while (node != null) { 
        const element = node as Element
        const id = element.getAttribute("xml:id")  
        const targetIds = element.getAttribute("plist")?.split(" ").map(ref => ref.replace("#", ""))
        const text = [...node.childNodes?.values()].filter(n => n.nodeType == Node.TEXT_NODE).map((n) => n.textContent).join("\n")

        const annot : Annotation = { id: id!!, targetIds: targetIds!!, text: text }
        annots.push(annot)
        
        node = matches.iterateNext()
    }
    return annots
}

export const getEditorial = (doc: Document) : EditorialItem[] => {
    const editorialElements: EditorialItem[] = 
        getNodesOfType(doc, "unclear")
        .concat(getNodesOfType(doc, "choice"))
        .concat(getNodesOfType(doc, "sic"))
        .concat(getNodesOfType(doc, "corr"))

    console.log(editorialElements)
    return editorialElements
}

export const filterScoreToNVerses = (score: string, numVerses: number) => {
    // First do a copy so we keep the original score around
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

