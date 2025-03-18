import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { VerovioOptions } from 'verovio';
import VerovioControls from './ScoreControls';
import { Scale } from './uidefs'
import useStore from "./store";
import ScoreProcessor from './ScoreProcessor';
import { getVerovioSvgExtraAttributes } from './hooks';
import ScoreAnalyzer from './ScoreAnalyzer';
import { Context } from './Context';
import Editorials from './Editorials';
import { useMeasure } from "react-use";
import { useSwipeable } from 'react-swipeable';

const MINIMUM_RENDER_SIZE = 300
const RESIZE_THRESHOLD = 250


interface VerovioProps {
    className?: string
}

// Convert UI scale to Verovio scale
const zoomToVerovioScale = (uiScale: number): number => {
    return Scale.MIN_VEROVIO_SCALE + ((uiScale - Scale.MIN_SCALE) / (Scale.MAX_SCALE - Scale.MIN_SCALE)) * (Scale.MAX_VEROVIO_SCALE - Scale.MIN_VEROVIO_SCALE)
}

const verovioBaseOptions: VerovioOptions = {
    breaks: 'auto',
    footer: 'none',
    header: 'none',
    adjustPageWidth: false,
    adjustPageHeight: false,
    scaleToPageSize: true,
    shrinkToFit: true,
    spacingLinear: 0.25,
    spacingNonLinear: 0.6,
    mdivAll: true,
    svgHtml5: false,
    svgViewBox: false,
    svgRemoveXlink: false,
    svgBoundingBoxes: true,
    lyricElision: "regular",
    /* lyricHeightFactor: 1.30, */
    /* lyricSize: 5, */
    lyricTopMinMargin: 4.0,
    lyricVerseCollapse: true,
    smuflTextFont: "none"
}

function Verovio({ className = '' }: VerovioProps) {

    const { verovio } = useContext(Context)

    const score = useStore.use.score()
    const scoreProperties = useStore.use.scoreProperties()

    const isLoading = useStore.use.isLoading()
    const setIsLoading = useStore.use.setIsLoading()

    const scoreSvg = useStore.use.scoreSvg()
    const setScoreSvg = useStore.use.setScoreSvg()

    const zoom = useStore.use.zoom()

    const currentPage = useStore.use.currentPage()
    const setCurrentPage = useStore.use.setCurrentPage()
    const pageCount = useStore.use.pageCount()
    const setPageCount = useStore.use.setPageCount()

    const anchorElementId = useStore.use.anchorElementId()
    const setAnchorElementId = useStore.use.setAnchorElementId()

    const showNVerses = useStore.use.showNVerses()
    const normalizeFicta = useStore.use.normalizeFicta()
    const showEditorial = useStore.use.showEditorial()

    const appOptions = useStore.use.appOptions()
    const choiceOptions = useStore.use.choiceOptions()

    const section = useStore.use.section()
    const setSection = useStore.use.setSection()

    const transposition = useStore.use.transposition()

    const scoreViewerRef = useRef<HTMLDivElement | null>(null)
    const [containerRef, { width: containerWidth, height: containerHeight }] = useMeasure<HTMLDivElement>()
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const isRenderingRef = useRef(false)

    const verovioSvgContainerRef = useRef<HTMLDivElement>(null)


    const filteredScore = useMemo(() => {
        if (!score) return null

        const scoreProcessor = new ScoreProcessor(score)
        if (showNVerses != scoreProperties?.numVerses) {
            scoreProcessor.addNVersesFilter(showNVerses)
        }
        if (normalizeFicta) {
            scoreProcessor.addNormalizeFictaFilter()
        }

        return scoreProcessor.filterScore()

    }, [score, showNVerses, normalizeFicta])


    const loadScore = (score: string) => {
        if (!verovio) return

        setIsLoading(true)

        const options: VerovioOptions = {
            ...verovioBaseOptions,
            svgAdditionalAttribute: getVerovioSvgExtraAttributes(),
            appXPathQuery: Object.values(appOptions) as string[],
            choiceXPathQuery: Object.values(choiceOptions) as string[],
            pageHeight: dimensions.height,
            pageWidth: dimensions.width,
            scale: zoomToVerovioScale(zoom),
            transpose: transposition != null ? transposition : ""
        }
        verovio.setOptions(options)
        verovio.loadData(score)
        return
    }


    // Function to render score with current settings
    const renderScore = () => {
        if (isRenderingRef.current || !verovio || !filteredScore) return

        if (dimensions.width < 100 || dimensions.height < 100) {
            return
        }

        isRenderingRef.current = true
        console.log(`Rendering score: w=${dimensions.width}, h=${dimensions.height}, scale=${zoom}`)
        try {
            const svgData = verovio.renderToSVG(currentPage)
            setScoreSvg(svgData)
            const analyzer = new ScoreAnalyzer(verovio.getMEI({ pageNo: currentPage }))
            const idForFirstMeasureInPage = analyzer.getFirstMeasureId()
            if (idForFirstMeasureInPage != null) {
                setAnchorElementId(idForFirstMeasureInPage)
            }
        } catch (error) {
            console.error("Failed to render score:", error)
        } finally {
            isRenderingRef.current = false
            setIsLoading(false)
        }
    }


    useEffect(() => {
        console.log("Container dimensions effect")
        if (!containerRef || !containerHeight || !containerWidth) return
        if (containerWidth < MINIMUM_RENDER_SIZE || containerHeight < MINIMUM_RENDER_SIZE) return

        if (Math.abs(containerWidth - dimensions.width) > RESIZE_THRESHOLD ||
            Math.abs(containerHeight - dimensions.height) > RESIZE_THRESHOLD) {
            setDimensions({ width: containerWidth, height: containerHeight })

        }
    }, [containerWidth, containerHeight])


    // Effect to load score data on score changes
    useEffect(() => {
        if (!verovio || !filteredScore || dimensions.width <= 0 || dimensions.height <= 0) return

        loadScore(filteredScore)
        const loadedPagesCount = verovio.getPageCount()
        if (loadedPagesCount <= 0) {
            console.log("Failed to load score")
            return
        }
        setPageCount(loadedPagesCount)
        if (currentPage > loadedPagesCount) {
            setCurrentPage(loadedPagesCount)
        }
        renderScore()

    }, [verovio, filteredScore, appOptions, choiceOptions, transposition])


    // Effect to trigger rendering on page changed
    useEffect(() => {
        if (!verovio || isLoading || currentPage < 1) return

        renderScore()
    }, [currentPage])

    useEffect(() => {
        if (!verovio || isLoading || currentPage < 1) return
        if (section != null) {
            const page = verovio.getPageWithElement(section)
            setSection(null)
            if (page != null && page > 0 && page != currentPage) {
                setCurrentPage(page)
                renderScore()
            }
        }
    }, [section])

    // On dimensions changes we need to re-load the data and find the page for last anchored element
    useEffect(() => {
        if (!verovio || isLoading || !filteredScore || dimensions.width <= 0 || dimensions.height <= 0) return

        loadScore(filteredScore)
        const loadedPagesCount = verovio.getPageCount()
        if (loadedPagesCount <= 0) {
            console.log("Failed to load score")
            return
        }
        if (anchorElementId != null) {
            let pageForMeasureOnView = verovio?.getPageWithElement(anchorElementId)
            if (pageForMeasureOnView != null && pageForMeasureOnView > 0) {
                    setCurrentPage(pageForMeasureOnView)
            }
        } else if (loadedPagesCount != pageCount && currentPage > loadedPagesCount) {
            setCurrentPage(loadedPagesCount)
        }
        setPageCount(loadedPagesCount)
        renderScore()

    }, [zoom, dimensions.width, dimensions.height])



    const isFullScreen = () => scoreViewerRef.current != null &&
        (scoreViewerRef.current.ownerDocument.fullscreenElement == scoreViewerRef.current)

    const handleFullScreenToggle = () => {
        if (!isFullScreen()) {
            scoreViewerRef.current?.requestFullscreen()
        } else {
            document.exitFullscreen()
        }
    }

    const handleExitFullScreen = () => {
        if (isFullScreen()) {
            document.exitFullscreen()
        }
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: (_) => {
            if (currentPage < pageCount) {
                setCurrentPage(currentPage + 1)
            }
        },
        onSwipedRight: (_) => {
            if (currentPage > 1) {
                setCurrentPage(currentPage - 1)
            }
        },
        delta: 10,
        swipeDuration: 300,
      });



    return (
        <div ref={scoreViewerRef} className={`verovio-score-viewer ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            <VerovioControls
                toggleFullScreen={handleFullScreenToggle} exitFullScreen={handleExitFullScreen}/>

                <div
                    className='verovio-container'
                    ref={containerRef}
                    style={{ minHeight: `${MINIMUM_RENDER_SIZE}px`  }}
                    >
                <div {...swipeHandlers}>
                    { scoreSvg ? (
                        <div ref={verovioSvgContainerRef}
                            className="score-svg-wrapper"
                            dangerouslySetInnerHTML={{ __html: scoreSvg }}/>
                    ) : null}

                </div>
            </div>


            {showEditorial ? <Editorials/> : null}

        </div>
    )
}

export default Verovio
