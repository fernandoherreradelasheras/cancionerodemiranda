import { useEffect, useMemo, useRef, useState } from 'react';
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';
import Pagination from './Pagination';
import { getSvgEdirtorialHighlightStyle, getSvgHighlightedMeasureStyle, getSvgMidiHighlightStyle, getSvgSelectedMeasureStyle, getVerovioSvgExtraAttributes, installWindowHooks, uninstallWindowHooks } from './hooks';
import AudioPlayer from './AudioPlayer';
import { filterScoreToNVerses, getEditorial, getNumMeasures, getPageForMeasureN, getPageForSection, maxVerseNum } from './Score';
import ClipLoader from "react-spinners/ClipLoader"

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

const svgRules = [1, 2, 3, 4, 5].map(i=> `.staff[data-n="${i}"] { --high: url(#highlighting-${i}); }`).join('\n') 



const svgFilter = (id: string, color: string) =>
    <filter id={`highlighting-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feFlood floodColor={color} result="base">
        </feFlood>
        <feGaussianBlur in="SourceAlpha" result="blur-out" stdDeviation="50" />
        <feOffset in="blur-out" result="the-shadow" />
        <feComposite result="drop" in="base" in2="color-out" operator="in" />
        <feBlend in="SourceGraphic" in2="drop" mode="normal" />
    </filter>




function Verovio({ mei_url, mp3_url, maxHeight, section, onScoreRendered, style }: {
    mei_url: string,
    mp3_url: string | undefined,
    maxHeight: number | undefined,
    section: string | undefined,
    onScoreRendered: (numMeasures: number) => void,
    style: {}
}) {
    const [scale, setScale] = useState(50)
    const [score, setScore] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0)
    const [scoreSvg, setScoreSvg] = useState<string>("")
    const [timeMap, setTimeMap] = useState<{} | null>(null)
    const [renderedMeiDoc, setRenderedMeiDoc] = useState<Document | null>(null)
    const [verovio, setVerovio] = useState<VerovioToolkit | null>(null);
    const [currentPageNumber, setCurrentPageNumber] = useState(1)
    const [hoverMeasure, setHoverMeasure] = useState<number | null>(null)
    const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null)
    const [showNVerses, setShowNVerses] = useState(0)
    const [midiHighlightElements, setMidiHiglightElements] = useState<string[]>([])
    const [prevSection, setPrevSection] = useState<string|null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [editorialElements, setEditorialElements] = useState({})
    const [showEditorial, setShowEditorial] = useState(false)

    const containerRef = useRef(null);


    const getVersesAmmountSelector = (numVerses: number | null) => {
        if (numVerses == null || numVerses < 2)
            return null

        const options: any[] = []
        for (let i = 0; i < numVerses; i++) {
            options.push((<option value={i + 1} key={i}>{i + 1} versos</option>))
        }

        return (
            <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline" }}>
                <em>Mostrar: </em>
                <select value={showNVerses} onChange={e => setShowNVerses(parseInt(e.target.value))} >{options}</select>
            </div>
        )
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
        console.log(mei_url)
        fetch(mei_url).then(response => {
            return response.text()
        }).then((score) => {
            setScore(score)
        });
    }, [mei_url]);


    const hoveredMeasure = (measure: number) => { setHoverMeasure(measure) }
    const unhoveredMeasure = (_: number) => { setHoverMeasure(null) }
    const clickedMeasure = (measure: number) => { setSelectedMeasure(measure) }

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



    useEffect(() => {
        if (verovio != null && containerRef.current != null && score != null) {
            //@ts-ignore
            const rect = containerRef.current.getBoundingClientRect()
            //@ts-ignore
            verovio.setOptions({
                ...verovioOptions,
                pageWidth: rect.width,
                pageHeight: rect.height,
                scale: scale,
                svgAdditionalAttribute: getVerovioSvgExtraAttributes(),

            })

            setIsLoading(true)

            if (showNVerses != null && showNVerses > 0 && parsedScore != undefined) {
                const filteredScore = filterScoreToNVerses(score, showNVerses)
                verovio.loadData(filteredScore)
            } else {
                verovio.loadData(score)
            }

            setPageCount(verovio.getPageCount())
            setTimeMap(verovio.renderToTimemap({ includeMeasures: true }))
            const renderedStr = verovio.getMEI({ pageNo: 0 })
            const parser = new DOMParser();
            setRenderedMeiDoc(parser.parseFromString(renderedStr, "application/xml"))
        }
    }, [score, verovio, scale, /*maxHeight,*/ showNVerses])





    if (verovio != null && renderedMeiDoc != null && section != null && section != prevSection) {
        const pageForSection = getPageForSection(renderedMeiDoc, verovio, section)
        if (pageForSection) {
            setHoverMeasure(null)
            setSelectedMeasure(null)
            setPrevSection(section)
            setCurrentPageNumber(pageForSection)
        }
    }

    useEffect(() => {
        if (verovio != null && containerRef.current != null && score != null) {
            setScoreSvg(verovio.renderToSVG(currentPageNumber))
            if (isLoading) {
                setIsLoading(false)
                if (renderedMeiDoc) {
                    const measuresCount = getNumMeasures(renderedMeiDoc)
                    const editorial = getEditorial(renderedMeiDoc)
                    onScoreRendered(measuresCount)
                    setEditorialElements(editorial)
                }
            }
        }
    }, [renderedMeiDoc, currentPageNumber])


    const onPageNumberClicked = (pageNumber: number) => {
        setHoverMeasure(null)
        setSelectedMeasure(null)
        setCurrentPageNumber(pageNumber)
    }

    const zoomOut = () => { if (scale >= 10) setScale(scale - 10) };
    const zoomIn = () => { if (scale < 150) setScale(scale + 10) };


    const { measuresSvgStyles, targetPage }
        : { measuresSvgStyles: string, targetPage: number | null } = useMemo(() => {
            if (!verovio || !renderedMeiDoc) {
                return { measuresSvgStyles: "", targetPage: null }
            }


            if (selectedMeasure == null && hoverMeasure == null) {
                return { measuresSvgStyles: "", targetPage: null }
            }

            var treeStyleString = ""
            if (selectedMeasure != null && selectedMeasure > 0) {
                let page = getPageForMeasureN(renderedMeiDoc, verovio, selectedMeasure)
                if (page != undefined && page > 0 && page != currentPageNumber) {
                    return { measuresSvgStyles: "", targetPage: page }
                }
                treeStyleString += getSvgSelectedMeasureStyle(selectedMeasure)
            }
            if (hoverMeasure != null && hoverMeasure > 0 && hoverMeasure != selectedMeasure) {
                let page = getPageForMeasureN(renderedMeiDoc, verovio, hoverMeasure)
                if (page != null && page > 0 && page == currentPageNumber) {
                    treeStyleString += getSvgHighlightedMeasureStyle(hoverMeasure)
                }
            }



            return { measuresSvgStyles: treeStyleString, targetPage: null }


        }, [renderedMeiDoc, selectedMeasure, hoverMeasure])


    if (targetPage != null) {
        setCurrentPageNumber(targetPage)
    }

    const numVersesAvailable = useMemo(() => {
        if (parsedScore != null) {
            return maxVerseNum(parsedScore)
        }
    }, [score])


    if (numVersesAvailable != null && numVersesAvailable > 1 && showNVerses == 0) {
        setShowNVerses(numVersesAvailable) // All by default
    }

    const onMidiUpdate = (off: string[], on: string[]) => {
        var newHighlightElements = []
        for (var e of midiHighlightElements) {
            if (!off.includes(e)) {
                newHighlightElements.push(e)
            }
        }

        newHighlightElements = newHighlightElements.concat(on)
        setMidiHiglightElements(newHighlightElements)
    }


    const getMidiHighlightStyles = () => {
        if (renderedMeiDoc == undefined || midiHighlightElements.length <= 0) {
            return ""
        }

        var styles = ""
        midiHighlightElements.forEach(id => {
            const pageForPlayingElement = verovio?.getPageWithElement(id)
            if (pageForPlayingElement != undefined && pageForPlayingElement > currentPageNumber) {
                setCurrentPageNumber(pageForPlayingElement)
            }
            styles += getSvgMidiHighlightStyle(id)

        });
        return styles
    }

    const getEditorialHighlightStyles = () => {
        if (renderedMeiDoc == undefined || !showEditorial || Object.keys(editorialElements).length <= 0) {
            return ""
        }

      
        return "g.unclear { outline: 75px ridge rgba(170, 50, 220, .6);  }"
    }


    const svgStyles = svgRules + measuresSvgStyles + getMidiHighlightStyles() + getEditorialHighlightStyles()
    console.log(showEditorial)

    return (

        <div style={style}>

            <svg xmlns="http://www.w3.org/2000/svg" overflow="visible" width="0" height="0">
                <defs>
                    {svgFilter("1", "#8e0000")}
                    {svgFilter("2", "#00ff00")}
                    {svgFilter("3", "#225c5c")}
                    {svgFilter("4", "#e9227a")}
                    {svgFilter("4", "#fa8072")}
                    {svgFilter("5", "#11ddff")}
                </defs>
            </svg>


            <style key={svgStyles} dangerouslySetInnerHTML={{ __html: svgStyles }} />
    
            <div style={{width: "100%", height: `${maxHeight}px`, position: "relative" }}>
                <ClipLoader
                    color="#f56a6a"
                    loading={isLoading}
                    cssOverride={{ top: "50%", left: "50%", position: "absolute" }}
                    size={100}
                    aria-label="Loading Spinner"
                    data-testid="loader"/>
                
                <div dangerouslySetInnerHTML={{ __html: scoreSvg }}
                    className="panel" ref={containerRef} style={{ top: 0, left: 0, width: "100%", height: "100%", position: "absolute", 
                        zIndex: 10, border: "1px solid lightgray" }}/>
            </div>
          
            <div style={{ display: "flex" }}>
                <ul className="actions" style={{ flex: 1 }}>
                    <li><a className="button icon primary fa-solid fa-magnifying-glass-minus" onClick={zoomOut}></a></li>
                    <li><a className="button icon primary fa-solid fa-magnifying-glass-plus" onClick={zoomIn}></a></li>
                </ul>

                { Object.keys(editorialElements).length > 0 ? 
                    <span><input 
                            name="chedk-editorial"
                            id="check-editorial"
                            type="checkbox"
                            checked={showEditorial}
                            onChange={(e) => { setShowEditorial(!showEditorial) }}/>
                <label htmlFor="check-editorial">Notas editoriales</label></span> : null } 

                {getVersesAmmountSelector(numVersesAvailable)}

                <Pagination
                    currentPageNumber={currentPageNumber}
                    totalPages={pageCount}
                    onPage={onPageNumberClicked} />

                <div style={{ flex: 1 }}>
                    {mp3_url != undefined ? <AudioPlayer src={mp3_url} timeMap={timeMap} onMidiUpdate={onMidiUpdate} /> : null }
                </div>
            </div>
        </div>
    );
}

export default Verovio;
