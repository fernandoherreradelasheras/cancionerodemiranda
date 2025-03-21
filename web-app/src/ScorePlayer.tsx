import useStore from "./store";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VerovioOptions } from "verovio";
import { getVerovioSvgExtraAttributes } from "./hooks";
import AudioPlayer, { PlayerEvent, PlayerEventType } from "./AudioPlayer";
import useVerovio from "./hooks/useVerovio";
import ScoreProcessor from "./ScoreProcessor";
import { SVG_STYLE_RULES } from "./svgutils";
import { useSize } from 'react-haiku';


const RENDERING_WIDTH_LIMIT = 12000

const ACTIVE_MEASURE_OPACITY = "1"
const ALMOST_ACTIVE_MEASURE_OPACITY = "0.6"
const INACTIVE_MEASURE_OPACITY = "0.3"

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

type PageMap = { [page:number] : PageMapEntry }


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
    const ts = timemap[timemap.length-1].tstamp || 0
    return ts
}

function ScorePlayer({ audioSrc }: { audioSrc: string }) {
    const score = useStore.use.score()
    const loading = useStore.use.isLoading()
    const setLoading = useStore.use.setIsLoading()
    const playing = useStore.use.playing()
    const setPlaying = useStore.use.setPlaying()

    const playingPosition = useStore.use.playingPosition()

    // We don't re-render on size changes because it's too expensive,
    // only on screen orientation change

    const scopeRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<Animation | null>(null)

    const verovio = useVerovio()

    const [pageMap, setPageMap] = useState<PageMap>({})
    const [page, setPage] = useState(0)
    const [timeMap, setTimeMap] = useState<TimeMapEvent[]>([])

    const [animationControl, setAnimationControl] = useState<any>(null)

    const playerViewportRef = useRef<HTMLDivElement>(null)
    const { height: viewportHeight } = useSize(playerViewportRef)

    const svgContainerRef = useRef<HTMLDivElement>(null)

    const [activeMeasure, setActiveMeasure] = useState<string | null>(null)
    const [almostActiveMeasures, setAlmostActiveMeasures] = useState<string[]>([])
    const [lastMidiHighlightEventIndex, setLastMidiHighlightEventIndex] = useState(0)
    const [midiHighlightElements, setMidHighlightElements] = useState<string[]>([])


    useLayoutEffect(() => {
        // TODO: See what we can move from here to an effect
        if (!timeMap || timeMap.length === 0 || !scopeRef.current || !playerViewportRef.current || !svgContainerRef.current) {
            return
        }

        if (!loading)   {
            return
        }

        const viewportBB = playerViewportRef.current.getBoundingClientRect()

        // Clear previous animation if exists
        if (animationRef.current) {
            animationRef.current.cancel()
            animationRef.current = null
        }

        const audioDuration = getAudioDurationMillis(timeMap)

        // The initial position that we add to every negative translation: the center of the viewport
        // Taking into account any horizontal borders or space taken by the container elements because
        // we are moving the svg into absolute positions
        const initialX = viewportBB.left +  playerViewportRef.current.clientWidth / 2 + (viewportBB.right - viewportBB.width)

        const keyframes: Keyframe[] = []

        const measuresOn = timeMap
            .filter((e) => e.measureOn !== undefined)
            .map((e) => { return { id: e.measureOn, ts: e.tstamp } })


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



        if (page == Object.values(pageMap).length) {
            // As timemap does not includes the notesOff for the
            // last notes the last element takes the remaining time.
            // So we just move the last element to the end of the time
            keyframes[keyframes.length - 1]!.offset = 1
        }
        const updatedPageMap = {
            ...pageMap,
            [page]: {
                ...pageMap[page],
                keyframes: keyframes
            }
        }
        setPageMap(updatedPageMap)

        // We are not done calculating all pages keyframes
        if (page < Object.values(pageMap).length) {
            setPage(page + 1)
            return
        }

        setPage(1)

        var allKeyFrames: Keyframe[] = []
        for (let p = 1; p <= Object.values(updatedPageMap).length; p++) {
            allKeyFrames = allKeyFrames.concat(updatedPageMap[p].keyframes)
            if (p < Object.values(updatedPageMap).length - 1) {
                const nextPageOffset = updatedPageMap[p+1].keyframes[0].offset!
                allKeyFrames.push({
                    transform: updatedPageMap[p].keyframes[updatedPageMap[p].keyframes.length - 1]?.transform,
                    offset:  nextPageOffset - 0.0001
                })
            }
        }

        const timing: KeyframeAnimationOptions = {
            duration: audioDuration,
            fill: "forwards",
            endDelay: 3000, // Just to ensure we don't restat the animation is the audio is longer than the timemap
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

        setLoading(false)
        setAnimationControl(controller)
    }, [pageMap, page])



    // Load and render score
    useLayoutEffect(() => {
        if (score && verovio && viewportHeight > 0) {
            setLoading(true)

            if (playing) {
                setPlaying(false)
            }

            const scoreProcessor = new ScoreProcessor(score)
            scoreProcessor.addNVersesFilter(1)
            const processedScore = scoreProcessor.filterScore()
            setMidHighlightElements([])

            const width = RENDERING_WIDTH_LIMIT
            verovio.setOptions({ ...options,
                pageWidth: width,
                pageHeight: viewportHeight,
             })
            verovio.loadData(processedScore)
            const pageCount = verovio.getPageCount()


            console.log(`loaded score with width=${RENDERING_WIDTH_LIMIT}, height=${viewportHeight}, pageCount=${pageCount}`)

            const timemap = verovio.renderToTimemap({ includeMeasures: true })
            const pagemap: PageMap = {}
            //var timemapIndex = 0
            timemap.forEach((event: TimeMapEvent) => {
                if (event.on != undefined) {
                    const eventPage = verovio.getPageWithElement(event.on[0])
                    if (eventPage && !pagemap.hasOwnProperty(eventPage)) {
                        pagemap[eventPage] = { pageStartTimestamp: event.tstamp, svg: "", renderedWidth: 0, keyframes: []}
                    }
                }
            })
            setTimeMap(timemap)
            for (let i = 1; i <= pageCount; i++) {
                console.log(`pre-rendering page ${i}`)
                const svgStr = verovio.renderToSVG(i)
                const match = svgStr.match(/svg viewBox="0 0 (\d+) \d+"/)
                const renderedWidth = match ? parseInt(match[1]) : width
                pagemap[i].svg = svgStr
                pagemap[i].renderedWidth = renderedWidth

            }
            setPageMap(pagemap)
            setPage(1)
        } else {
            setTimeMap([])
            setPageMap({})
            setLoading(true)
        }
    }, [score, verovio])


    // While playing, update page, active measures and midi highlights based on current playback position
    useEffect(() => {
        if (!timeMap || timeMap.length === 0 || !animationControl) return

        if (!playing) {
            if (animationControl.playing) {
                animationControl.pause()
            }
            for (let staff = 1; staff <= 5; staff++) {
                const a = document.querySelector(`#radius-${staff}-animation`) as SVGAnimateElement | null
                a?.endElement()
            }
            return
        }

        const currentPlayingPosition = Math.round(playingPosition)
        if (currentPlayingPosition == 0) {
            // After we stop playing we don't reset the page to remain
            // showing the end. So we need to set it here
            animationControl.time = 0
            if (page != 1) {
                setPage(1)
            }
        } else {
            const targetPage = getPageForMillis(currentPlayingPosition)
            if (targetPage != page) {
                setPage(targetPage)
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
        const nextActiveMeasure = timeMap.slice(activeMeasureIdx+1).find((e) => e.measureOn)?.measureOn
        if (currentActiveMeasure != activeMeasure) {
            setAlmostActiveMeasures([prevActiveMeasure, nextActiveMeasure].filter((e) => e != null))
            setActiveMeasure(currentActiveMeasure)
        }
        updateMidiHighlightElements(currentPlayingPosition)

    }, [playingPosition, playing, timeMap])


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
            if (millis >= pageMap[i].pageStartTimestamp && (i == pageCount || millis < pageMap[i+1].pageStartTimestamp)) {
                return i
            }
        }
        // When a page stars with a rest, the start timestamp is set after the real page start.
        return page
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
                    const foundInOnElements = onElements.indexOf(e);
                    if (foundInOnElements > -1) {
                        onElements.splice(foundInOnElements, 1);
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
        for (let highlight of onElements) {
            if (midiHighlightElements.includes(highlight)) {
                continue
            }
            const staff = document.querySelector(`.staff:has( #${highlight})`)?.getAttribute("data-n")
            if (staff) {
                const a = document.querySelector(`#radius-${staff}-animation`) as SVGAnimateElement | null
                a?.beginElement()
            }
        }
        setMidHighlightElements(highlights)
        setLastMidiHighlightEventIndex(i-1)
        return
    }


    // Using the filter on the note bouding box gets the whole lyrics and can be quite confusing
    // But stem, is too thin to get really highlight with the svg filter, so...
    const getSvgMidiHighlightStyle = (id: string) =>
        `#${id}.note .notehead { filter: var(--high);   }\n`    +
        `g#${id}.note g.stem path { color: var(--hgcolor); stroke-width: 50;  }\n` +
        `g#${id}.note .verse[data-n="1"] { font-weight: bold; }\n`


    const getStylesForElements = (ids: string[]) => {
        var styles = ""
        ids.forEach(id => {
            styles += getSvgMidiHighlightStyle(id) + "\n"
        });

        return SVG_STYLE_RULES + "\n" +  styles
    }

    const almostActiveStyle = playing && almostActiveMeasures.length > 0 ?
        almostActiveMeasures.map(id =>
            `.measure#${id} { opacity: ${ALMOST_ACTIVE_MEASURE_OPACITY}; }`).join("\n") + "" : ""
    const activeStyle = playing && activeMeasure ?
        `.measure#${activeMeasure} { opacity: ${ACTIVE_MEASURE_OPACITY}; }` : ""
    const inactiveStyle = playing && (almostActiveMeasures.length > 0 || activeMeasure) ?
        `.measure { opacity: ${INACTIVE_MEASURE_OPACITY}; }` : ""
    const notesSyle = getStylesForElements(midiHighlightElements)

    return (
        <div>

          <style>
              {`
                ${inactiveStyle}
                ${almostActiveStyle}
                ${activeStyle}
                ${notesSyle}
             `}
           </style>

            <AudioPlayer
                audioSrc={audioSrc}
                timeMap={timeMap}
                onPlayerEvent={handlePlayerEvent}
            />
            <div ref={playerViewportRef} className="player-viewport" style={{ width: "100%",  height: 'min(80vh, 800px)', overflow: "clip" }}>
                <div className="animating" ref={scopeRef} style={{ willChange: "transform" }}>
                    {page > 0 ? <div className="new-player-container"
                        ref={svgContainerRef}
                        style={{
                            width: `${pageMap[page].renderedWidth}px`,
                            willChange: "transform",
                            transform: 'translateZ(0)',  // Force GPU acceleration
                        }}
                        dangerouslySetInnerHTML={{ __html: pageMap[page].svg }}
                    /> : null}
                </div>
            </div>

        </div>
    )
}

export default ScorePlayer