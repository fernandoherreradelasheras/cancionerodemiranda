import useStore from "./store";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { VerovioOptions } from "verovio";
import { getVerovioSvgExtraAttributes } from "./hooks";
import AudioPlayer, { PlayerEvent, PlayerEventType } from "./AudioPlayer";
import useVerovio from "./hooks/useVerovio";
import ScoreProcessor from "./ScoreProcessor";
import { Spin } from "antd";
import { SVG_STYLE_RULES } from "./svgutils";

const RENDERING_WIDTH_LIMIT = 22000
const DEFAULT_HEIGHT = 1000

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
    pageHeight:  DEFAULT_HEIGHT,
    scale: 100,
    transpose: ""
}

const getAudioDurationMillis = (timemap: TimeMapEvent[]) => {
    const ts = timemap.at(-1)?.tstamp || 0
    return ts
}

function ScorePlayer({ audioSrc }: { audioSrc: string }) {
    const score = useStore.use.score()
    const playing = useStore.use.playing()
    const playingPosition = useStore.use.playingPosition()

    const scopeRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<Animation | null>(null)

    const verovio = useVerovio()

    const [lastTimemapEventIdx, setLastTimemapEventIdx] = useState(-1)

    const [loading, setLoading] = useState(true)
    const [pageWidth, setPageWidth] = useState(10000)
    const [renderedWidth, setRenderedWidth] = useState(10000)

    const [timeMap, setTimeMap] = useState<TimeMapEvent[]>([])

    const [svg, setSvg] = useState<string>("")
    const [animationControl, setAnimationControl] = useState<any>(null)

    const svgContainerRef = useRef<HTMLDivElement>(null)

    const [activeMeasure, setActiveMeasure] = useState<string | null>(null)
    const [almostActiveMeasures, setAlmostActiveMeasures] = useState<string[]>([])
    const [midiHighlightElements, setMidHighlightElements] = useState<string[]>([])



    useLayoutEffect(() => {
        // TODO: See what we can move from here to an effect
        const parent = svgContainerRef.current?.parentElement?.parentElement
        const svgElement = svgContainerRef.current?.firstElementChild as SVGElement | undefined

        if (!parent || !svgElement || !timeMap || timeMap.length === 0 || !scopeRef.current || !svgContainerRef.current) {
            return
        }

        // Clear previous animation if exists
        if (animationRef.current) {
            animationRef.current.cancel()
            animationRef.current = null
        }

        const audioDuration = getAudioDurationMillis(timeMap)
        const parentBB = parent.getBoundingClientRect()

        // The initial position that we add to every negative translation: the center of the viewport
        // Taking into account any horizontal borders or space taken by the container elements because
        // we are moving the svg into absolute positions
        const initialX = parentBB.left + parent.clientWidth / 2 + (parentBB.right - parentBB.width)

        // Create keyframes for WAAPI
        const keyframes: Keyframe[] = []

        const measuresOn = timeMap
            .filter((e) => e.measureOn !== undefined)
            .map((e) => { return { id: e.measureOn, ts: e.tstamp } })


        measuresOn.forEach((measure) => {
            const measureElement = svgElement.querySelector(`#${measure.id}`)

            if (measureElement) {
                const bb = measureElement.getBoundingClientRect()

                const xPosition = initialX - Math.floor(bb.left + bb.width / 2)

                keyframes.push({
                    transform: `translateX(${xPosition}px)`,
                    offset: measure.ts / audioDuration
                })
            }
        })

        // As timemap does not includes the notesOff for the
        // last notes the last element takes the remaining time.
        // So we just move the last element to the end of the time
        keyframes.at(-1)!.offset = 1

        const timing: KeyframeAnimationOptions = {
            duration: audioDuration,
            fill: "forwards",
            endDelay: 0,
        }

        animationRef.current = scopeRef.current.animate(keyframes, timing)
        animationRef.current.pause()

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

    }, [loading, timeMap])


    // Handle playback controls
    useEffect(() => {
        if (!animationControl) return

        if (playing) {
            if (!animationControl.playing) {
                console.log("playing animation")
                animationControl.play()
            }
            if (playingPosition == 0) {
                console.log("Playing position is 0, resetting animation to initial position")
                animationControl.time = 0
            }
        } else {
            console.log("pausing")
            animationControl.pause()
        }
    }, [playing, animationControl, playingPosition])

    // Load and render score
    useEffect(() => {
        if (score && verovio) {
            const scoreProcessor = new ScoreProcessor(score)
            scoreProcessor.addNVersesFilter(1)
            const processedScore = scoreProcessor.filterScore()
            setMidHighlightElements([])


            let pageCount
            let width
            do {
                width = (width === undefined || pageCount === undefined)
                    ? pageWidth
                    : width * pageCount * 0.75

                verovio.setOptions({ ...options, pageWidth: width })
                verovio.loadData(processedScore)
                pageCount = verovio.getPageCount()
                console.log(`width: ${width}, pageCount: ${pageCount}`)
            } while (pageCount > 1 && width < RENDERING_WIDTH_LIMIT)

            console.log(`Rendering score at width ${width}`)
            if (pageCount > 1) {
                console.log(`${pageCount} remaining to render`)
            }

            const timemap = verovio.renderToTimemap({ includeMeasures: true })
            const svgStr = verovio.renderToSVG(1)
            // a little hackish but it is worth to have the actual width of the svg before rendering it
            const svgWidth = svgStr.match(/svg viewBox="0 0 (\d+) \d+"/)
            setRenderedWidth(svgWidth ? parseInt(svgWidth[1]) : width)
            setSvg(svgStr)
            setPageWidth(width)
            setTimeMap(timemap)
            setLoading(false)
        } else {
            setTimeMap([])
            setSvg("")
        }
    }, [score, verovio])

    // Update active measures based on current playback position
    useEffect(() => {
        if (!timeMap || timeMap.length === 0) return

        const currentPlayingPosition = Math.round(playingPosition)
        const currentTimemapEventIdx = timeMap.findIndex((event, idx) => {
            return (currentPlayingPosition > event.tstamp &&
                (idx == timeMap.length - 1 || currentPlayingPosition < timeMap[idx + 1]?.tstamp))
        })

        if (currentTimemapEventIdx == -1 || currentTimemapEventIdx <= lastTimemapEventIdx) {
            return
        }

        const event = timeMap[currentTimemapEventIdx]

        if (event.measureOn) {
            // don't assume previous measure is the one active before, as we might have seeked
            const nextMeasure = currentTimemapEventIdx < timeMap.length ?
                timeMap.slice(currentTimemapEventIdx+1).find((e) => e.measureOn)?.measureOn : null
            const prevMeasure = currentTimemapEventIdx > 0 ?
                timeMap.slice(0, currentTimemapEventIdx).reverse().find((e) => e.measureOn)?.measureOn : null
            setAlmostActiveMeasures([prevMeasure, nextMeasure].filter((e) => e != null))
            setActiveMeasure(event.measureOn)
        }

        const lastConsumedEventIdx = updateMidiHighlightElements(playingPosition, currentTimemapEventIdx)
        setLastTimemapEventIdx(lastConsumedEventIdx)



    }, [playingPosition, timeMap])


    // Handle player events (seeking)
    const handlePlayerEvent = (event: PlayerEvent) => {
        if (event.type == PlayerEventType.SEEK) {
            if (animationControl) {
                console.log("Seeking, changing animation time to ", event.value / 1000)
                animationControl.time = event.value / 1000

                if (!playing) {
                    // Force visual update when paused
                    animationControl.play()
                    animationControl.pause()
                }
            }
            if (playing) {
                setMidHighlightElements([])
            } else {
                // In case we are pause we wont be highlighting the notes
                // on a following playingPosition update and it's nice
                // to have it
                var i = 0
                while  ((timeMap[i].tstamp) <= event.value) {
                    i++
                }
                var nextElements = undefined
                while (nextElements == undefined) {
                    nextElements = timeMap[i]?.on
                    i++
                }
                if (nextElements) {
                    setMidHighlightElements(nextElements)
                }
            }
        }
    }

    const updateMidiHighlightElements = (playMilis: number, timeMapIndex: number) => {
        var onElements: string[] = Array()
        var offElements: string[] = Array()

        var i = timeMapIndex
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

        const highlightElements = midiHighlightElements.filter(e => !offElements.includes(e)).concat(onElements)
        setMidHighlightElements(highlightElements)
        return i - 1
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

            {loading ? (
                <div className="loading-spinner-parent">
                    <Spin size="large" />
                </div>
            ) : null}

            <div className="player-viewport" style={{  width: "100%", height: "auto", minHeight: `${DEFAULT_HEIGHT}`, overflow: "clip" }}>

               <div className="animating" ref={scopeRef} style={{ willChange: "transform" }}>

                    <div className="new-player-container"
                        ref={svgContainerRef}
                        style={{
                            width: `${renderedWidth}px`,
                            height: `${DEFAULT_HEIGHT}px`,
                            willChange: "transform",
                            transform: 'translateZ(0)',  // Force GPU acceleration
                        }}
                        dangerouslySetInnerHTML={{ __html: svg }}
                    />
                </div>

            </div>
        </div>
    )
}

export default ScorePlayer