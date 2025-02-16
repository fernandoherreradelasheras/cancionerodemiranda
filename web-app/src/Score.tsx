import { VerovioToolkit } from "verovio/esm"


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

const addNodesOfType = (doc: Document, registry: {}, type: string) =>  {
    let matches = doc?.evaluate(`//mei:${type}`, doc, nsResolver, XPathResult.ANY_TYPE, null)
    console.log(matches)
    let node = matches.iterateNext()
    console.log(node)
    while (node != null) {
        for (const child of node.childNodes) {
            console.log(child) 
            if (child.nodeType != Node.ELEMENT_NODE)
                continue
            const childId = child.getAttribute("xml:id")
            if (childId) {
                const entry = { type: "unclear", node: node }
                if (registry[childId] == undefined) {
                    registry[childId] = [ entry ]
                } else {
                    registry[childId].push(entry)
                }
            }  
        }      
        node = matches.iterateNext()
    }
}

export const getEditorial = (doc: Document) => {
    const editorialElements = {}
    addNodesOfType(doc, editorialElements, "unclear")
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

