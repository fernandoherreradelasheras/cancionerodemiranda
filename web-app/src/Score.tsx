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

