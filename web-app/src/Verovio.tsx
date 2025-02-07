import { useEffect, useMemo, useRef, useState } from 'react';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import Pagination from './Pagination';
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
}

const nsResolver = (ns: string) => { return { mei: "http://www.music-encoding.org/ns/mei", xml: "http://www.w3.org/XML/1998/namespace" }[ns] }

function Verovio({ mei_url, maxHeight, style }: {
    mei_url: string,
    maxHeight: number | undefined,
    style: {}
}) {
    const [scale, setScale] = useState(50)
    const [score, setScore] = useState<string | null>(null);
    const [meiDoc, setMeiDoc] = useState<Document | null>(null)
    const [verovio, setVerovio] = useState<VerovioToolkit | null>(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1)
    const [hoverMeasure, setHoverMeasure] = useState<number|null>(null)
    const [selectedMeasure, setSelectedMeasure] = useState<number|null>(null)
    
    const containerRef = useRef(null);
    

    const getPageForMeasureN = (n: number) => { 
        //@ts-ignore
        let xmlid = meiDoc?.evaluate(`//mei:measure[@n="${n}"]/@xml:id`, meiDoc, nsResolver, XPathResult.ANY_TYPE, null)?.iterateNext()?.value
        return verovio?.getPageWithElement(xmlid)    
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



    const renderedScore = useMemo(() => {
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
            verovio.loadData(score)
            const pageCount = verovio.getPageCount()
            const renderedHtml = verovio.renderToSVG(currentPageNumber)
            const parser = new DOMParser();
            setMeiDoc(parser.parseFromString(verovio.getMEI({pageNo: 0}), "application/xml"))

            return { pageCount: pageCount, html: renderedHtml }
        } else {
            return { pageCount: 0, html: (<div>Loading....</div>) }
        }

    }, [score, verovio, scale, /*maxHeight,*/ currentPageNumber])


    const onPageNumberClicked = (pageNumber: number) => { 
        setHoverMeasure(null)
        setSelectedMeasure(null)
        setCurrentPageNumber(pageNumber)
    }

    const zoomOut = () => { if (scale >= 10) setScale(scale - 10) };
    const zoomIn = () => { if (scale < 150) setScale(scale + 10) };



    var treeStyleString = ""

    if (selectedMeasure != null && selectedMeasure != undefined && selectedMeasure > 0) {
        let page = getPageForMeasureN(selectedMeasure)
        if (page != undefined && page > 0 && page != currentPageNumber) {
            setCurrentPageNumber(page)
        }
        treeStyleString += getSvgSelectedMeasureStyle(selectedMeasure)    
    }
    if (hoverMeasure != null && hoverMeasure != undefined &&  hoverMeasure > 0 && hoverMeasure != selectedMeasure) {
        let page = getPageForMeasureN(hoverMeasure)
        if (page != null && page > 0 && page == currentPageNumber) {
            treeStyleString += getSvgHighlightedMeasureStyle(hoverMeasure)
        }
    }
    

    return (
        

        <div style={style}>
            
            <style dangerouslySetInnerHTML={{__html: treeStyleString }} />

            <div dangerouslySetInnerHTML={{ __html: renderedScore.html }}
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

                <Pagination
                    currentPageNumber={currentPageNumber}
                    totalPages={renderedScore.pageCount}
                    onPage={onPageNumberClicked} />
                    
                <div style={{ flex: 1 }}></div>
            </div>
        </div>
    );
}

export default Verovio;