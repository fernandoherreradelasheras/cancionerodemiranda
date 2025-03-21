import useStore from "./store";
import { useEffect, useRef, useState } from "react";
import { VerovioOptions } from "verovio";
import { getVerovioSvgExtraAttributes } from "./hooks";
import AudioPlayer, { PlayerEvent, PlayerEventType } from "./AudioPlayer";
import useVerovio from "./hooks/useVerovio";
import ScoreProcessor from "./ScoreProcessor";
import { SVG_STYLE_RULES } from "./svgutils";
import { useSize } from 'react-haiku';


const RENDERING_WIDTH_LIMIT = 16000

type TimeMapEvent = {
    on?: string[],
    off?: string[],
    measureOn?: string,
    qstamp: number,
    tstamp: number,
    tempo?: number,
}

type PageMapEntry = {
    pageStartTimestamp: number
    svg: string,
    renderedWidth: number,
    keyframes: Keyframe[]
}

type PageMap = { [page: number]: PageMapEntry }


const options: VerovioOptions = {
    breaks: 'auto',
    footer: 'none',
    header: 'none',
    adjustPageWidth: true,
    adjustPageHeight: false,
    pageMarginRight: 0,
    pageMarginLeft: 0,
    scaleToPageSize: true,
    shrinkToFit: true,
    spacingLinear: 0.25,
    spacingNonLinear: 0.6,
    mdivAll: true,
    svgHtml5: false,
    svgViewBox: true,
    svgRemoveXlink: false,
    svgBoundingBoxes: true,
    lyricElision: "regular",
    /* lyricHeightFactor: 1.30, */
    /* lyricSize: 5, */
    lyricTopMinMargin: 4.0,
    lyricVerseCollapse: true,
    smuflTextFont: "none",
    svgAdditionalAttribute: getVerovioSvgExtraAttributes(),
    scale: 100,
    transpose: ""
}

const getAudioDurationMillis = (timemap: TimeMapEvent[]) => {
    const ts = timemap[timemap.length - 1].tstamp || 0
    return ts
}

function ScorePlayer({ audioSrc }: { audioSrc: string }) {
    const score = useStore.use.score()
    const setIsLoading = useStore.use.setIsLoading()
    const playing = useStore.use.playing()
    const setPlaying = useStore.use.setPlaying()

    const playingPosition = useStore.use.playingPosition()

    const scopeRef = useRef<HTMLDivElement>(null)
    const svgContainerRef = useRef<HTMLDivElement>(null)

    const animationRef = useRef<Animation | null>(null)

    const verovio = useVerovio()

    const [initializationStage, setInitializationStage] = useState('idle'); // 'idle', 'processing', 'ready'
    const [currentProcessingPage, setCurrentProcessingPage] = useState(0)

    const persistentSvgRef = useRef<HTMLDivElement>(null)
    const svgRenderedRef = useRef(false)

    const [pageMap, setPageMap] = useState<PageMap>({})
    const [page, setPage] = useState(0)
    const [timeMap, setTimeMap] = useState<TimeMapEvent[]>([])

    const [animationControl, setAnimationControl] = useState<any>(null)

    const playerViewportRef = useRef<HTMLDivElement>(null)
    const { height: viewportHeight } = useSize(playerViewportRef)

    const [activeMeasure, setActiveMeasure] = useState<string | null>(null)
    const [almostActiveMeasures, setAlmostActiveMeasures] = useState<string[]>([])
    const [lastMidiHighlightEventIndex, setLastMidiHighlightEventIndex] = useState(0)
    const [midiHighlightElements, setMidHighlightElements] = useState<string[]>([])


    useEffect(() => {
        if (viewportHeight === 0 || initializationStage == "ready" ) {
            return
        }

        if (score && verovio) {
            setInitializationStage('processing')
            setCurrentProcessingPage(0)

            if (playing) {
                setPlaying(false)
            }

            const scoreProcessor = new ScoreProcessor(score)
            scoreProcessor.addNVersesFilter(1)
            const processedScore = scoreProcessor.filterScore()
            setMidHighlightElements([])

            const width = RENDERING_WIDTH_LIMIT
            verovio.setOptions({
                ...options,
                pageWidth: width,
                pageHeight: viewportHeight,
            })

            verovio.loadData(processedScore)
            const pageCount = verovio.getPageCount()

            console.log(`loaded score with width=${RENDERING_WIDTH_LIMIT}, height=${viewportHeight}, pageCount=${pageCount}`)

            const timemap = verovio.renderToTimemap({ includeMeasures: true })
            const pagemap: PageMap = {}

            timemap.forEach((event: TimeMapEvent) => {
                if (event.on !== undefined) {
                    const eventPage = verovio.getPageWithElement(event.on[0])
                    if (eventPage && !pagemap.hasOwnProperty(eventPage)) {
                        pagemap[eventPage] = { pageStartTimestamp: event.tstamp, svg: "", renderedWidth: 0, keyframes: [] }
                    }
                }
            })

            setTimeMap(timemap)

            for (let i = 1; i <= pageCount; i++) {
                console.log(`pre-rendering page ${i}`)
                const svgStr = verovio.renderToSVG(i)
                const match = svgStr.match(/svg viewBox="0 0 (\d+) \d+"/)
                const renderedWidth = match ? parseInt(match[1]) : width
                pagemap[i] = {
                    ...pagemap[i],
                    svg: svgStr,
                    renderedWidth: renderedWidth,
                }
            }

            setPageMap(pagemap)
            setCurrentProcessingPage(1)
        } else {
            setTimeMap([])
            setPageMap({})
            setIsLoading(true)
        }
    }, [score, verovio, viewportHeight])

    useEffect(() => {
        if (initializationStage !== 'processing' || currentProcessingPage === 0 || !timeMap.length || !playerViewportRef.current) {
            return
        }

        const processingComplete = currentProcessingPage > Object.keys(pageMap).length

        if (processingComplete) {
            console.log('pre-rendering done.')
            setInitializationStage('ready')
            setCurrentProcessingPage(1)
            svgRenderedRef.current = false
            return
        }

        const viewportBB = playerViewportRef.current.getBoundingClientRect()
        const audioDuration = getAudioDurationMillis(timeMap)
        const initialX = viewportBB.left + playerViewportRef.current.clientWidth / 2 + (viewportBB.right - viewportBB.width)

        if (svgContainerRef.current != null) {
            svgContainerRef.current.innerHTML = pageMap[currentProcessingPage].svg
            svgContainerRef.current.style.width = `${pageMap[currentProcessingPage].renderedWidth}px`
        }

        const keyframes: Keyframe[] = []
        const measuresOn = timeMap
            .filter((e) => e.measureOn !== undefined)
            .map((e) => { return { id: e.measureOn, ts: e.tstamp } })

        console.log(svgContainerRef.current?.firstElementChild)

        measuresOn.forEach((measure) => {
            var measureElement = svgContainerRef.current?.querySelector(`#${measure.id}`)
            if (measureElement) {
                const bb = measureElement.getBoundingClientRect()
                const xPosition = initialX - Math.floor(bb.left + bb.width / 2)
                keyframes.push({
                    transform: `translateX(${xPosition}px)`,
                    offset: measure.ts / audioDuration
                })
            }
        })

        if (currentProcessingPage == Object.keys(pageMap).length) {
            keyframes[keyframes.length - 1]!.offset = 1
        }
        setPageMap(prev => ({
            ...prev,
            [currentProcessingPage]: {
                ...prev[currentProcessingPage],
                keyframes: keyframes
            }
        }))
        setCurrentProcessingPage(currentProcessingPage + 1)
    }, [initializationStage, currentProcessingPage, pageMap, timeMap])

    useEffect(() => {
        if (initializationStage !== 'ready' || !timeMap.length || !scopeRef.current) {
            return
        }

        if (animationRef.current) {
            animationRef.current.cancel()
            animationRef.current = null
        }

        const audioDuration = getAudioDurationMillis(timeMap)

        let allKeyFrames: Keyframe[] = []
        for (let p = 1; p <= Object.keys(pageMap).length; p++) {
            allKeyFrames = allKeyFrames.concat(pageMap[p].keyframes)
            if (p < Object.keys(pageMap).length - 1) {
                const nextPageOffset = pageMap[p + 1].keyframes[0].offset!
                allKeyFrames.push({
                    transform: pageMap[p].keyframes[pageMap[p].keyframes.length - 1]?.transform,
                    offset: nextPageOffset - 0.0001
                })
            }
        }

        const timing: KeyframeAnimationOptions = {
            duration: audioDuration,
            fill: "forwards",
            endDelay: 3000,
        }

        animationRef.current = scopeRef.current.animate(allKeyFrames, timing)
        if (!playing) {
            animationRef.current.pause()
        } else {
            animationRef.current.play()
        }

        const controller = {
            pause: () => {
                if (animationRef.current) animationRef.current.pause()
            },
            play: () => {
                if (animationRef.current) animationRef.current.play()
            },
            stop: () => {
                if (animationRef.current) {
                    animationRef.current.cancel()
                    animationRef.current = null
                }
            },
            get playing() {
                return animationRef.current?.playState === "running"
            },
            set time(value: number) {
                if (animationRef.current) {
                    animationRef.current.currentTime = value * 1000
                }
            },
            get time() {
                return (typeof animationRef.current?.currentTime === 'number' ? animationRef.current.currentTime : 0) / 1000
            }
        }

        setAnimationControl(controller)
        setIsLoading(false)
    }, [initializationStage, pageMap, timeMap])

    useEffect(() => {
        if (initializationStage !== 'ready' || !persistentSvgRef.current || !pageMap[currentProcessingPage]) {
            return
        }

        if (!svgRenderedRef.current) {
            console.log(`rendering new svg for page ${currentProcessingPage}`)
            persistentSvgRef.current.innerHTML = pageMap[currentProcessingPage].svg
            persistentSvgRef.current.style.width = `${pageMap[currentProcessingPage].renderedWidth}px`
            svgRenderedRef.current = true
        }
    }, [currentProcessingPage, initializationStage, pageMap])

    useEffect(() => {
        if (initializationStage !== 'ready' || !timeMap.length || !animationControl) {
            return
        }

        if (!playing) {
            if (animationControl.playing) {
                animationControl.pause()
            }
            stopGlowingNotes()
            return
        }

        const currentPlayingPosition = Math.round(playingPosition)
        if (currentPlayingPosition === 0) {
            animationControl.time = 0
            if (currentProcessingPage !== 1) {
                setCurrentProcessingPage(1)
                svgRenderedRef.current = false
            }
        } else {
            const targetPage = getPageForMillis(currentPlayingPosition)
            if (targetPage !== currentProcessingPage) {
                setCurrentProcessingPage(targetPage)
                svgRenderedRef.current = false
            }
        }

        if (!animationControl.playing) {
            animationControl.play()
        }

        const activeEventIdx = timeMap.findIndex((e) => e.tstamp > currentPlayingPosition) - 1
        if (activeEventIdx < 0) {
            return
        }

        const activeMeasureIdx = timeMap[activeEventIdx].measureOn ? activeEventIdx :
            activeEventIdx - timeMap.slice(0, activeEventIdx).reverse().findIndex((e) => e.measureOn) - 1

        const currentActiveMeasure = timeMap[activeMeasureIdx].measureOn!
        const prevActiveMeasure = timeMap.slice(0, activeMeasureIdx).reverse().find((e) => e.measureOn)?.measureOn
        const nextActiveMeasure = timeMap.slice(activeMeasureIdx + 1).find((e) => e.measureOn)?.measureOn

        if (currentActiveMeasure !== activeMeasure) {
            setAlmostActiveMeasures([prevActiveMeasure, nextActiveMeasure].filter((e) => e != null))
            setActiveMeasure(currentActiveMeasure)
        }

        updateMidiHighlightElements(currentPlayingPosition)
    }, [playingPosition, playing, timeMap, initializationStage, animationControl])


    useEffect(() => {
        if (!persistentSvgRef.current || !svgRenderedRef.current || initializationStage !== 'ready') {
            return
        }

        persistentSvgRef.current.querySelectorAll('.note-highlight').forEach(el => {
            el.classList.remove('note-highlight')
        })

        midiHighlightElements.forEach(id => {
            const noteElement = persistentSvgRef.current?.querySelector(`#${id}`) as SVGGElement | null
            if (noteElement) {
                const notehead = noteElement.querySelector('.notehead')
                if (notehead) notehead.classList.add('note-highlight')

                const stem = noteElement.querySelector('g.stem path')
                if (stem) stem.classList.add('note-highlight')

                const verse = noteElement.querySelector('.verse[data-n="1"]')
                if (verse) verse.classList.add('note-highlight')
            }
        })
    }, [midiHighlightElements, initializationStage])

    useEffect(() => {
        if (!persistentSvgRef.current || !svgRenderedRef.current || initializationStage !== 'ready') {
            return
        }
        const parent = persistentSvgRef.current

        parent.querySelectorAll('.new-player-container svg .measure.active, ' +
            '.new-player-container svg .measure.almost-active').forEach(el => {
                   el.classList.remove('active', 'almost-active')
        })

        if (activeMeasure) {
          const element = parent.querySelector(`.new-player-container svg #${activeMeasure}`)
          if (element) element.classList.add('active')
        }

        almostActiveMeasures.forEach(id => {
          const element = parent.querySelector(`.new-player-container svg #${id}`)
          if (element) element.classList.add('almost-active')
        })
      }, [activeMeasure, almostActiveMeasures, initializationStage])




    // Handle player events (seeking)
    const handlePlayerEvent = (event: PlayerEvent) => {
        if (!animationControl) {
            return
        }
        if (event.type == PlayerEventType.SEEK) {
            // Do not change page neither restart the animation when pause and seek to 0 (audio end)
            if (event.value > 0) {
                animationControl.time = event.value / 1000
                const seekPage = getPageForMillis(event.value)
                if (seekPage != page) {
                    // Update page now if paused instead of waiting until next position update
                    setPage(seekPage)
                }
            }
            if (!playing) {
                // In case we are paused we wont be highlighting the notes
                // on a following playingPosition update and it's nice
                // to have them show
                setLastMidiHighlightEventIndex(0)
                const activeEventIdx = timeMap.findIndex((e) => e.tstamp > event.value) - 1
                const onElements = timeMap[activeEventIdx].on ?
                    timeMap[activeEventIdx].on
                    : timeMap.slice(0, activeEventIdx).reverse().find((e) => e.on)?.on
                setMidHighlightElements(onElements || [])
            }
        }
    }

    const getPageForMillis = (millis: number) => {
        const pageCount = Object.entries(pageMap).length
        for (let i = 1; i <= pageCount; i++) {
            if (millis >= pageMap[i].pageStartTimestamp && (i == pageCount || millis < pageMap[i + 1].pageStartTimestamp)) {
                return i
            }
        }
        // When a page stars with a rest, the start timestamp is set after the real page start.
        return page
    }

    const stopGlowingNotes = () => {
        [1, 2, 3, 4, 5].forEach(i => {
            const a = document.querySelector(`#radius-${i}-animation`) as SVGAnimateElement | null
            a?.endElement()
        })
    }

    const startGlowingNotes = (highlightElements: string[]) => {
        for (let highlight of highlightElements) {
            if (midiHighlightElements.includes(highlight)) {
                continue
            }
            const staff = document.querySelector(`.staff:has( #${highlight})`)?.getAttribute("data-n")
            if (staff) {
                const a = document.querySelector(`#radius-${staff}-animation`) as SVGAnimateElement | null
                a?.beginElement()

            }
        }
    }

    const updateMidiHighlightElements = (playMilis: number) => {
        var onElements: string[] = Array()
        var offElements: string[] = Array()

        var i = playMilis > 0 ? lastMidiHighlightEventIndex : 0
        while (timeMap[i].tstamp <= playMilis && i < timeMap.length - 1) {
            const off = timeMap[i].off
            if (off != undefined) {
                offElements = offElements.concat(off)
                for (let e of off) {
                    const foundInOnElements = onElements.indexOf(e)
                    if (foundInOnElements > -1) {
                        onElements.splice(foundInOnElements, 1)
                    }
                }
            }
            const on = timeMap[i].on
            if (on != undefined) {
                onElements = onElements.concat(on)
            }
            i++
        }

        const highlights = midiHighlightElements.filter(e => !offElements.includes(e)).concat(onElements)
        startGlowingNotes(highlights)
        setMidHighlightElements(highlights)
        setLastMidiHighlightEventIndex(i - 1)
        return
    }




    const noteHighlightStyle = `
    .notehead.note-highlight { filter: var(--high); }
    g.stem path.note-highlight { color: var(--hgcolor); stroke-width: 50; }
    .verse[data-n="1"].note-highlight { font-weight: bold; }
  `

    return (
        <div>

            <style>
                {`
                    ${SVG_STYLE_RULES}
                    ${noteHighlightStyle}
                `}
            </style>

            <AudioPlayer
                audioSrc={audioSrc}
                timeMap={timeMap}
                onPlayerEvent={handlePlayerEvent}
            />
            <div ref={playerViewportRef} className="player-viewport" style={{ width: "100%", height: 'min(80vh, 800px)', overflow: "clip" }}>
                {initializationStage === 'processing' && (
                    <div
                        ref={svgContainerRef}
                        style={{
                            position: 'absolute',
                            width: 0,
                            height: 0,
                            overflow: 'hidden',
                            visibility: 'hidden'
                        }}
                    />
                )}
                <div
                    className="animating"
                    ref={scopeRef}
                    style={{
                        willChange: "transform",
                        transform: 'translateZ(0)',
                        backfaceVisibility: 'hidden'
                    }}
                >
                    {initializationStage === 'ready' && (
                        <div
                            className={`new-player-container${playing ? ' playing' : ''}`}
                            ref={persistentSvgRef}
                            style={{
                                willChange: "transform",
                                transform: 'translateZ(0)',
                                backfaceVisibility: 'hidden'
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default ScorePlayer