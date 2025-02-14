import { useEffect, useMemo, useRef, useState } from 'react';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import Pagination from './Pagination';
import {  } from 'html-midi-player'
import { getSvgHighlightedMeasureStyle, getSvgSelectedMeasureStyle, getVerovioSvgExtraAttributes, installWindowHooks, uninstallWindowHooks } from './hooks';


const verovioOptions = {
    breaks: "auto",
    footer: "none",
    header: "none",
    justifyVertically: false,
    scaleToPageSize: true,
    shrinkToFit: true,
    adjustPageHeight: false,
    adjustPageWidth: false,
    pageMarginLeft: 10,
    pageMarginRight: 10,
    pageMarginTop: 30,
    pageMarginBottom: 10,
    svgViewBox: true,
    svgBoundingBoxes: true,
    lyricElision: "regular", 
    lyricHeightFactor: 1.30,
    lyricSize: 5,
    lyricTopMinMargin: 4.0,
    lyricVerseCollapse: true
}


const nsResolver = (ns: string) => { return { mei: "http://www.music-encoding.org/ns/mei", xml: "http://www.w3.org/XML/1998/namespace" }[ns] }

function Verovio({ mei_url, maxHeight, style }: {
    mei_url: string,
    maxHeight: number | undefined,
    style: {}
}) {
    const [scale, setScale] = useState(50)
    const [score, setScore] = useState<string | null>(null);
    const [renderedMeiDoc, setRenderedMeiDoc] = useState<Document | null>(null)
    const [verovio, setVerovio] = useState<VerovioToolkit | null>(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1)
    const [hoverMeasure, setHoverMeasure] = useState<number|null>(null)
    const [selectedMeasure, setSelectedMeasure] = useState<number|null>(null)
    const [showNVerses, setShowNVerses] = useState(0)
    
    const containerRef = useRef(null);
    

    const maxVerseNum = (doc: Document) => { 
        //@ts-ignore
        let maxN = doc?.evaluate("//mei:verse/@n[not(. < ../../mei:verse/@n)][1]", doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
        console.log(maxN)
        return maxN
    }

    const getPageForMeasureN = (doc: Document, n: number) => { 
        //@ts-ignore
        let xmlid = doc?.evaluate(`//mei:measure[@n="${n}"]/@xml:id`, doc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
        return verovio?.getPageWithElement(xmlid)    
    }

    const getVersesAmmountSelector = (numVerses: number | null) => {
        if (numVerses == null || numVerses < 2) 
            return null

        const options: any[] = []
        for (let i = 0; i < numVerses; i++) {
            options.push( ( <option value={i+1} key={i}>{i+1} versos</option>) )
         } 

        return (
         <div style={{ display: "flex", flexDirection: "row",  alignItems: "baseline" }}>
            <em>Mostrar: </em>
            <select value={showNVerses} onChange={e => setShowNVerses(parseInt(e.target.value))} >{options}</select> 
        </div>
        )
    }


    const filterScoreToNVerses = (score: string, numVerses: number) => {
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
        nodes.forEach(n => n.parentElement?.removeChild(n) )        

        const s = new XMLSerializer();
        return s.serializeToString(doc);
    }

    useEffect(() => {
        setTimeout(() => {
            createVerovioModule().then(VerovioModule => {
                const verovioToolkit = new VerovioToolkit(VerovioModule);
                console.log(verovioToolkit.getVersion());
                setVerovio(verovioToolkit);
            });
        });
    }, []);


    useEffect(() => {
        fetch(mei_url).then(response => {
            return response.text()
        }).then((score) => {
            setScore(score)
        });
    }, [mei_url]);


    const hoveredMeasure = (measure: number) => { setHoverMeasure(measure)}
    const unhoveredMeasure = (_: number) => { setHoverMeasure(null) }
    const clickedMeasure = (measure: number) => { setSelectedMeasure(measure)}

    const installHooks = (window: any) => {
        installWindowHooks(window, { 
            onMouseEnterMusicNotesMeasureNumber: hoveredMeasure,
            onMouseLeaveMusicNotesMeasureNumber: unhoveredMeasure,
            onMusicNotesMeasureNumberClick: clickedMeasure
        })
    }

    const uninstallHooks = (window: any) => {
        uninstallWindowHooks(window, {
            onMouseEnterMusicNotesMeasureNumber: hoveredMeasure,
            onMouseLeaveMusicNotesMeasureNumber: unhoveredMeasure,
            onMusicNotesMeasureNumberClick: clickedMeasure
        })
    }


    useEffect(() => {
        if (containerRef.current != null) {
            installHooks(window)
        }

        return () => {
            uninstallHooks(window)
        }

    }, [containerRef]);


    const parsedScore = useMemo(() => {
        if (score != null) {
            const parser = new DOMParser();
            return parser.parseFromString(score, "application/xml")
        }
    }, [score])

    const renderedHtml = useMemo(() => {
        if (verovio != null && containerRef.current != null && score != null) {
            //@ts-ignore
            const rect = containerRef.current.getBoundingClientRect()
            //@ts-ignore
            verovio.setOptions( { ...verovioOptions,
                 pageWidth: rect.width,
                 pageHeight:  rect.height,
                 scale: scale,
                 svgAdditionalAttribute: getVerovioSvgExtraAttributes(),

            })

            if (showNVerses != null && showNVerses > 0 && parsedScore != undefined) {
                const filteredScore = filterScoreToNVerses(score, showNVerses) 
                verovio.loadData(filteredScore)
            } else {
                verovio.loadData(score)
            }

            const pageCount = verovio.getPageCount()
            const renderedHtml = verovio.renderToSVG(currentPageNumber)
            const parser = new DOMParser();
            setRenderedMeiDoc(parser.parseFromString(verovio.getMEI({pageNo: 0}), "application/xml"))

            return { pageCount: pageCount, html: renderedHtml }
        } else {
            return { pageCount: 0, html: (<div>Loading....</div>) }
        }

    }, [score, verovio, scale, /*maxHeight,*/ currentPageNumber, showNVerses])


    const onPageNumberClicked = (pageNumber: number) => { 
        setHoverMeasure(null)
        setSelectedMeasure(null)
        setCurrentPageNumber(pageNumber)
    }

    const zoomOut = () => { if (scale >= 10) setScale(scale - 10) };
    const zoomIn = () => { if (scale < 150) setScale(scale + 10) };



    

    const {svgStyles, targetPage  } 
    : {svgStyles: string | null, targetPage: number | null } = useMemo(() => {
        if (!renderedMeiDoc) {
            return { svgStyles: null, targetPage: null }
        }


        if (selectedMeasure == null && hoverMeasure == null) {
            return { svgStyles: null, targetPage: null }
        }

        var treeStyleString = ""
        if (selectedMeasure != null && selectedMeasure > 0) {
            let page = getPageForMeasureN(renderedMeiDoc, selectedMeasure)
            if (page != undefined && page > 0 && page != currentPageNumber) {
                return { svgStyles: null, targetPage: page  }
            }
            treeStyleString += getSvgSelectedMeasureStyle(selectedMeasure)    
        }
        if (hoverMeasure != null &&  hoverMeasure > 0 && hoverMeasure != selectedMeasure) {
            let page = getPageForMeasureN(renderedMeiDoc, hoverMeasure)
            if (page != null && page > 0 && page == currentPageNumber) {
                treeStyleString += getSvgHighlightedMeasureStyle(hoverMeasure)
            }
        }
        return { targetPage: null, svgStyles: treeStyleString }

    
    }, [renderedMeiDoc, selectedMeasure, hoverMeasure])


    if (targetPage != null) {
        setCurrentPageNumber(targetPage)
    }

    const numVersesAvailable  = useMemo(() => {
        if (parsedScore != null) {
            return maxVerseNum(parsedScore)
        }
    }, [score])


    if (numVersesAvailable != null && numVersesAvailable > 1 && showNVerses == 0) {
        setShowNVerses(numVersesAvailable) // All by default
    }

    
    return (        

        <div style={style}>

            <style dangerouslySetInnerHTML={{__html: svgStyles! }} />

            <div dangerouslySetInnerHTML={{ __html: renderedHtml.html }}
                className="panel" ref={containerRef} style={{
                    border: "1px solid lightgray",
                    width: "100%", 
                    height: `${maxHeight}px`
                }}>

            </div>
            <div style={{ display: "flex"  }}>
                <ul className="actions" style={{ flex: 1 }}>
                    <li><a className="button icon primary fa-solid fa-magnifying-glass-minus" onClick={zoomOut}></a></li>
                    <li><a className="button icon primary fa-solid fa-magnifying-glass-plus" onClick={zoomIn}></a></li>
                </ul>

                {getVersesAmmountSelector(numVersesAvailable)}

                <Pagination
                    currentPageNumber={currentPageNumber}
                    totalPages={renderedHtml.pageCount}
                    onPage={onPageNumberClicked} />
                    
                <div style={{ flex: 1 }}></div>
            </div>
        </div>
    );
}

export default Verovio;