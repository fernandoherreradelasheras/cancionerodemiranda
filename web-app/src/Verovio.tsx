import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from 'react-tooltip'
import createVerovioModule from 'verovio/wasm';
import { VerovioToolkit } from 'verovio/esm';


import { getStaffTooltipContent, getSvgHighlightedMeasureStyle, getSvgMidiHighlightStyle, getSvgSelectedMeasureStyle, getVerovioSvgExtraAttributes, installWindowHooks, SVG_STAFF_CSS_SELECTOR, uninstallWindowHooks } from './hooks';
import { filterScoreNormalizingFicta, filterScoreToNVerses, getEditor, getEditorial, getFirstMeasureN, getMeiNotes, getNumMeasures, getPageForMeasureN, getPageForSection, getTargettableChildren, hasFictaElements, maxVerseNum, scoreAddTitles } from './Score';
import Pagination from './Pagination';

import AudioPlayer from './AudioPlayer';
import SvgOverlay from './SvgOverlay';
import { Choice, EditorialItem } from './Editorial'
import { SVG_FILTERS, SVG_STYLE_RULES } from './svgutils';
import { TonoDef } from './utils';


import SimpleToggle from './SimpleToggle';
import SimpleIconButton from './SimpleIconButton';

import { library } from '@fortawesome/fontawesome-svg-core'
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus, faCog } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Context } from './Context';


let verovio: VerovioToolkit

createVerovioModule().then(VerovioModule => {
    verovio = new VerovioToolkit(VerovioModule)
    console.log(verovio.getVersion());
})


const verovioOptions = {
    breaks: "auto",
    footer: "none",
    header: "none",
    scaleToPageSize: true,
    shrinkToFit: true,
    adjustPageHeight: false,
    adjustPageWidth: false,
    justifyVertically: true,
    mdivAll: true,
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
    lyricVerseCollapse: true,
    smuflTextFont: "none"
}

library.add(faMagnifyingGlassMinus, faMagnifyingGlassPlus, faCog)



function Verovio({ mei_url, mp3_url, maxHeight, section, style, onNotesUpdated }: {
    tono: TonoDef,
    mei_url: string,
    mp3_url: string | undefined,
    maxHeight: number | undefined,
    section: string | undefined,
    style: {},
    onNotesUpdated: (notes: string[]) => void
}) {

    const { scoreCache, setScoreCache } = useContext(Context)


    const [scale, setScale] = useState(50)
    const [score, setScore] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0)
    const [scoreSvg, setScoreSvg] = useState<string>("")
    const [timeMap, setTimeMap] = useState<{} | null>(null)
    const [loadedMeiDoc, setLoadedMeiDoc] = useState<Document | null>(null)
    const [measuresCount, setMeasuresCount] = useState<number|null>(null)
    const [firstMeasureOnPage, setFirstMeasureOnPage] = useState<string|null>(null)
    const [editor, setEditor] = useState <string|null>(null)
    const [currentPageNumber, setCurrentPageNumber] = useState(1)
    const [hoverMeasure, setHoverMeasure] = useState<number | null>(null)
    const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null)
    const [showNVerses, setShowNVerses] = useState(0)
    const [midiHighlightElements, setMidiHiglightElements] = useState<string[]>([])
    const [midiHightlightStyles, setMidiHiglightStyles] = useState<string|null>(null)
    const [prevSection, setPrevSection] = useState<string|null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasEditorialElements, setHasEditorialElements] = useState(false)
    const [editorialOverlays, setEditorialOverlays] = useState<EditorialItem[]>([])
    const [showEditorial, setShowEditorial] = useState(false)
    const [normalizeFicta, setNormalizeFicta] = useState(false)
    const [appOptions, setAppOptions] = useState<string[]>([])
    const [choiceOptions, setChoiceOptions] = useState<string[]>([])


    const containerRef = useRef<HTMLDivElement>(null);

    const onOptionSelected = (type: string, choice: Choice, selectedOptionIndex: number) => {
        const removeEntries = choice.options.filter((_, index) => index != selectedOptionIndex).map(o => o.selector)
        if (type == "app") {
            const newOptions = appOptions.filter(o => !removeEntries.includes(o))
            newOptions.push(choice.options[selectedOptionIndex].selector)
            setAppOptions(newOptions)
        } else if (type == "choice") {
            const newOptions = choiceOptions.filter(o => !removeEntries.includes(o))
            newOptions.push(choice.options[selectedOptionIndex].selector)
            setChoiceOptions(newOptions)
        }
    }


    const getVersesAmmountSelector = (numVerses: number) => {

        const options: any[] = []


        for (let i = 0; i < numVerses; i++) {
            options.push((<option value={i + 1} key={i}>{i + 1} verso{ i > 0 ? "s" : ""}</option>))
        }

        const disabled = numVerses <= 1

        return (
            <div className={`verovio-topbar-element${disabled ? " disabled" : ""}`}>
                <select style={{width: "auto"}} disabled={disabled} value={showNVerses} onChange={e => setShowNVerses(parseInt(e.target.value))} >{options}</select>
            </div>
        )
    }


    const loadScore = (score: string) => {
        const scoreWithTitles = scoreAddTitles(score)
        setScore(scoreWithTitles)
    }


    useEffect(() => {
        if (scoreCache != undefined && scoreCache[mei_url] != undefined) {
            loadScore(scoreCache[mei_url])
        } else {
            fetch(mei_url).then(response => {
                return response.text()
            }).then((score) => {
                setScoreCache(
                    {...scoreCache,  [mei_url]: score}
                )
                loadScore(score)
            });
        }
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

    const filterScore = (score: string) => {
        if (parsedScore == undefined) {
            return score
        }

        var newScore = score;

        if (showNVerses != null && showNVerses > 0) {
            newScore = filterScoreToNVerses(newScore, showNVerses)
        }
        if (normalizeFicta) {
            newScore = filterScoreNormalizingFicta(newScore)
        }

        return newScore

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
                appXPathQuery: Object.values(appOptions) as string[],
                choiceXPathQuery: Object.values(choiceOptions) as string[]
            })

            setIsLoading(true)

            verovio.loadData(filterScore(score))

            setPageCount(verovio.getPageCount())
            setTimeMap(verovio.renderToTimemap({ includeMeasures: true }))
            const loadedDocStr = verovio.getMEI({ pageNo: 0 })
            const parser = new DOMParser();
            const meiDoc = parser.parseFromString(loadedDocStr, "application/xml")
            const notes = getMeiNotes(meiDoc)
            if (notes && notes.length > 0 && onNotesUpdated != null) {
                onNotesUpdated(notes)
            }
            setLoadedMeiDoc(meiDoc)
        }
    }, [score, verovio, showNVerses, normalizeFicta, appOptions, choiceOptions])


    useEffect(() => {
        if (verovio != null && containerRef.current != null && score != null) {
            //@ts-ignore
            const rect = containerRef.current.getBoundingClientRect()
            //@ts-ignore
            const options = {
                pageWidth: rect.width,
                pageHeight: rect.height,
                scale: scale,
            }

            verovio.setOptions(options)
            verovio.redoLayout()

            setTimeMap(verovio.renderToTimemap({ includeMeasures: true }))
            const loadedDocStr = verovio.getMEI({ pageNo: 0 })
            setPageCount(verovio.getPageCount())
            const parser = new DOMParser();
            const meiDoc = parser.parseFromString(loadedDocStr, "application/xml")
            setLoadedMeiDoc(meiDoc)

            if (firstMeasureOnPage != null)  {
                const newPageNumber = verovio.getPageWithElement(firstMeasureOnPage)
                if (newPageNumber != currentPageNumber) {
                    setCurrentPageNumber(newPageNumber)
                }
            }
        }
    }, [scale])


    if (verovio != null && loadedMeiDoc != null && section != null && section != prevSection) {
        const pageForSection = getPageForSection(loadedMeiDoc, verovio, section)
        if (pageForSection) {
            setHoverMeasure(null)
            setSelectedMeasure(null)
            setPrevSection(section)
            setCurrentPageNumber(pageForSection)
        }
    }


    useEffect(() => {
        if (verovio != null && containerRef.current != null && score != null) {
            console.log(`rendering page ${currentPageNumber}`)
            const svgString = verovio.renderToSVG(currentPageNumber)
            setScoreSvg(svgString)
            if (isLoading) {
                setIsLoading(false)
                if (loadedMeiDoc) {
                    setMeasuresCount(getNumMeasures(loadedMeiDoc))
                    const editor = getEditor(loadedMeiDoc)
                    setEditor(editor ? editor : "<missing>")
                }
                containerRef.current?.scrollIntoView({
                    behavior: 'smooth'
                  })
            }
            const parser = new DOMParser();

            const currentPageMei = parser.parseFromString(verovio.getMEI({ pageNo: currentPageNumber }), "application/xml")
            setFirstMeasureOnPage(getFirstMeasureN(currentPageMei))
        }
    }, [loadedMeiDoc, currentPageNumber, scale])


    const onPageNumberClicked = (pageNumber: number) => {
        setHoverMeasure(null)
        setSelectedMeasure(null)
        setCurrentPageNumber(pageNumber)
    }


    const updateScale = (scale: number) => {
        setScale(scale)
    }


    const zoomOut = () => { if (scale >= 10) updateScale(scale - 10) };
    const zoomIn = () => { if (scale < 150) updateScale(scale + 10) };


    const { measuresSvgStyles, targetPage }
        : { measuresSvgStyles: string, targetPage: number | null } = useMemo(() => {
            if (!verovio || !loadedMeiDoc) {
                return { measuresSvgStyles: "", targetPage: null }
            }


            if (selectedMeasure == null && hoverMeasure == null) {
                return { measuresSvgStyles: "", targetPage: null }
            }

            var treeStyleString = ""
            if (selectedMeasure != null && selectedMeasure > 0) {
                let page = getPageForMeasureN(loadedMeiDoc, verovio, selectedMeasure)
                if (page != undefined && page > 0 && page != currentPageNumber) {
                    return { measuresSvgStyles: "", targetPage: page }
                }
                treeStyleString += getSvgSelectedMeasureStyle(selectedMeasure)
            }
            if (hoverMeasure != null && hoverMeasure > 0 && hoverMeasure != selectedMeasure) {
                let page = getPageForMeasureN(loadedMeiDoc, verovio, hoverMeasure)
                if (page != null && page > 0 && page == currentPageNumber) {
                    treeStyleString += getSvgHighlightedMeasureStyle(hoverMeasure)
                }
            }

            return { measuresSvgStyles: treeStyleString, targetPage: null }


        }, [loadedMeiDoc, selectedMeasure, hoverMeasure])


    if (targetPage != null) {
        setCurrentPageNumber(targetPage)
    }

    const numVersesAvailable = useMemo(() => {
        if (parsedScore != null) {
            return maxVerseNum(parsedScore)
        } else {
            return 1
        }
    }, [score])


    if (numVersesAvailable != null && numVersesAvailable > 1 && showNVerses == 0) {
        setShowNVerses(numVersesAvailable) // All by default
    }

    const hasFicta = useMemo(() => {
        if (parsedScore != null) {
            return hasFictaElements(parsedScore)
        } else {
            return false
        }
    }, [score])

    const onMidiUpdate = (isPlaying: boolean, off: string[], on: string[]) => {
        var newHighlightElements = []
        var styles: string | null = null
        var newPage: number | null = null

        if (!isPlaying) {
            setMidiHiglightElements([])
            setMidiHiglightStyles("")
            return
        }

        for (var e of midiHighlightElements) {
            if (!off.includes(e)) {
                newHighlightElements.push(e)
            }
        }

        newHighlightElements = newHighlightElements.concat(on)
        if (loadedMeiDoc != undefined && midiHighlightElements.length > 0) {
            styles = ""
            newHighlightElements.forEach(id => {
                const pageForPlayingElement = verovio?.getPageWithElement(id)
                if (pageForPlayingElement != undefined && pageForPlayingElement > currentPageNumber) {
                    newPage = pageForPlayingElement
                }
                styles += getSvgMidiHighlightStyle(id)

            });
        }
        setMidiHiglightElements(newHighlightElements)
        if (styles != null) setMidiHiglightStyles(styles)
        if (newPage != null) setCurrentPageNumber(newPage)
    }


    const updateChoicesWithCurrentOptions = (editorialOverlays: EditorialItem[]) => {
        editorialOverlays.forEach(e => {
            if (e.choice != undefined) {
                const choice = e.choice
                choice.options.forEach((option, index) => {
                    if (e.type == "app" && Object.values(appOptions).includes(option.selector)) {
                        choice.selectedOptionIdx = index
                    } else if (e.type == "choice" &&  Object.values(choiceOptions).includes(option.selector)) {
                        choice.selectedOptionIdx = index
                    }
                })
            }
        })
    }

    const getBBForSelector = (container: SVGSVGElement, selector: string) => {
        let svgG = container.querySelector(selector)
        if (svgG) {
            const bb = svgG.getBoundingClientRect()
            if (bb.width > 0 && bb.height > 0) {
                return bb
            }
        }
        return null
    }

    const buildItemWithBB = (item: EditorialItem, bb: DOMRect, offsetX: number, offsetY: number) => {
        return {
            ...item, boundingBox: { x: bb.x - offsetX, y: bb.y - offsetY, width: bb.width, height: bb.height }
        }
    }


    useEffect(() => {

        if (containerRef.current == null || loadedMeiDoc == null) {
            return
        }

        const editorialElements = getEditorial(loadedMeiDoc)
        if (Object.keys(editorialElements).length <= 0) {
            return
        }

        const container = containerRef.current
        let svg = container.children[0] as SVGSVGElement
        if (svg == null) {
            return
        }

        const editorialOverlays: EditorialItem[] = []

        let svgBB = svg.getBoundingClientRect();

        for (const item of editorialElements) {
            const bb = getBBForSelector(svg, `#${item.id}`)
            if (bb) {
                editorialOverlays.push(buildItemWithBB(item, bb, svgBB.x, svgBB.y ))
            } else {
                // Some element like measures have empty bounding boxes, so we need to terget the children
                const children = getTargettableChildren(loadedMeiDoc, item.id)
                for (const id of children) {
                    const cbb = getBBForSelector(svg, `#${id}`)
                    if (cbb) {
                        editorialOverlays.push(buildItemWithBB(item, cbb, svgBB.x, svgBB.y ))
                    }
                }
            }
            if (item.correspIds != undefined) {
                item.correspIds.forEach(id => {
                    const bb = getBBForSelector(svg, `[data-corresp="#${id}"]`)
                    if (bb) {
                        editorialOverlays.push(buildItemWithBB(item, bb, svgBB.x, svgBB.y ))
                    }
                })
            }
        }

        setHasEditorialElements(editorialElements.length > 0)
        updateChoicesWithCurrentOptions(editorialOverlays)
        setEditorialOverlays(editorialOverlays)
    }, [scoreSvg])

    const musicInfo = (
        <div className="small verovio-topbar-element vertical-list" >
            <span>Compases: {measuresCount != null ? measuresCount : ""}</span><br/>
            <span>Editor: {editor != null ? editor : ""}</span><br/>
        </div>
    )



    const svgStyles = SVG_STYLE_RULES + measuresSvgStyles + midiHightlightStyles

    return (

        <div style={style}>

            <div className="verovio-topbar">
                <SimpleIconButton icon={faMagnifyingGlassMinus}
                    onClick={zoomOut}/>
                <SimpleIconButton icon={faMagnifyingGlassPlus}
                    onClick={zoomIn}/>

                <SimpleToggle text="Notas editoriales" toggled={showEditorial} enabled={hasEditorialElements}
                     onClick={() => setShowEditorial(!showEditorial)}/>

                <SimpleToggle text="Normalizar M.Ficta" toggled={normalizeFicta} enabled={hasFicta}
                     onClick={() => setNormalizeFicta(!normalizeFicta)}/>


                {getVersesAmmountSelector(numVersesAvailable)}

            <div className="verovio-topbar-element">

            </div>

                <Pagination
                    className="verovio-topbar-element topbar-center"
                    currentPageNumber={currentPageNumber}
                    totalPages={pageCount}
                    onPage={onPageNumberClicked} />

                { musicInfo }

                <div className="verovio-topbar-element topbar-right">
                    {mp3_url != undefined ?
                        <AudioPlayer src={mp3_url} timeMap={timeMap} onMidiUpdate={onMidiUpdate} enabled={scoreSvg != ""} />
                         : null }
                </div>
            </div>

            <Tooltip id="verovio-tooltip" delayShow={500} delayHide={300} anchorSelect={SVG_STAFF_CSS_SELECTOR} render={getStaffTooltipContent}/>

            <style key={svgStyles} dangerouslySetInnerHTML={{ __html: svgStyles }} />

            <div style={{width: "100%", height: `${maxHeight}px`, position: "relative" }}>
                { isLoading ?
                    <FontAwesomeIcon
                        className="loading-spinner"
                        icon={faCog}
                        spin
                        size="10x"
                        aria-label="Loading Spinner"/> : null }


                <div dangerouslySetInnerHTML={{ __html: scoreSvg }}
                    className="panel" ref={containerRef} style={{ top: 0, left: 0, width: "100%", height: "100%", position: "absolute",
                        zIndex: 1, border: "1px solid lightgray" }}/>

                {showEditorial && containerRef.current != null && editorialOverlays.length > 0 ?
                <SvgOverlay width={containerRef.current?.getBoundingClientRect().width}
                     height={containerRef.current?.getBoundingClientRect().height} editorialOverlays={editorialOverlays}
                     onOptionSelected={onOptionSelected}
                      /> : null }
            </div>

            {SVG_FILTERS}

        </div>
    );
}

export default Verovio;
