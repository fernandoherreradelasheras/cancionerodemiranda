import { useState, useRef } from "react";

import { library } from '@fortawesome/fontawesome-svg-core'

import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Flex, Slider, SliderSingleProps, theme } from "antd";
import useStore from "./store";



const str2padded = (n: number) => (Math.floor(n)).toString().padStart(2, '0')

const formatTime = (secs: number) => `${str2padded(secs / 60)}:${str2padded(secs % 60)}`

const formatter: NonNullable<SliderSingleProps['tooltip']>['formatter'] = (value) => formatTime(value ? value : 0)

library.add(faPause, faPlay)


function AudioPlayer ({ enabled } : {
    enabled: boolean,
}) {

    const [canPlay, setCanPlay] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [seekValue, setSeekValue] = useState(0)

    const audioRef = useRef<HTMLAudioElement>(null)

    const src = useStore.use.scoreAudioFile()
    const timeMap = useStore.use.timeMap()
    const timeMapIndex = useStore.use.timeMapIndex()
    const setTimeMapIndex = useStore.use.setTimeMapIndex()
    const midiHighlightElements = useStore.use.midiHighlightElements()
    const setMidHighlightElements = useStore.use.setMidHighlightElements()

    const {
        token: { colorPrimary },
      } = theme.useToken();



    const play = () => {
        setIsPlaying(!isPlaying)
    }

    const onCanPlay = (_: any) => {
        setCanPlay(true)
    }

    const onTimeUpdate = (e: any)  => {
        var onElements : string[] = Array()
        var offElements : string[]  = Array()
        const playTime = Math.floor(e.target.currentTime * 1000)
        var i = timeMapIndex

        const updatedTimeMap = (i == 0)
        if (i == 0) {
            while  (parseInt(timeMap[i]['tstamp']) < playTime) {
                i++
            }
        }

        while  (parseInt(timeMap[i]['tstamp']) <= playTime) {
            const off = timeMap[i]['off']
            if (off != undefined) {
                offElements = offElements.concat(off)
                for (e of off) {
                    const foundInOnElements = onElements.indexOf(e);
                    if (foundInOnElements > -1) {
                        onElements.splice(foundInOnElements, 1);
                    }
                }
            }
            const on = timeMap[i]['on']
            if (on != undefined) {
                onElements = onElements.concat(on)
            }
            i++
        }
        setTimeMapIndex(i)

        const highlightElements = updatedTimeMap ? onElements : midiHighlightElements.filter(e => !offElements.includes(e)).concat(onElements)
        setMidHighlightElements(highlightElements, true)
    }

    const onAudioEnded = (_: any) => {
        setTimeMapIndex(0)
        setIsPlaying(false)
        setMidHighlightElements([], true)
    }

    const onSeek = (newSecs: number) => {
        if (audioRef.current == null) {
            return
        }

        audioRef.current.currentTime = newSecs
        var i = 0
        while  (Math.floor(parseInt(timeMap[i]['tstamp']) / 1000) <= newSecs) {
            i++
        }
        setTimeMapIndex(i)
        let nextElement
        while ((nextElement = timeMap[i]?.on[0]) == undefined) {
            i++
        }
        if (nextElement) {
            // We are setting only the first highlight element on seek.
            // In case we are playing all the element will be set on the next onTimeUpdate callback
            // but not when we are in pause. But at least we get the viewer to the right page
            setMidHighlightElements([nextElement], true)
        }
    }

    if (audioRef.current != null) {
        if (isPlaying && audioRef.current.paused) {
            audioRef.current.play()
        } else if (!isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    }

    const audioProgress = timeMap != null ? timeMapIndex / timeMap.length  : 0
    const durationSecs = typeof audioRef.current?.duration == "number" && audioRef.current?.duration >= 0 ? Math.floor(audioRef.current?.duration) : 0
    const durationStr = formatTime(durationSecs)
    const currentTimeSecs = Math.floor(durationSecs * audioProgress) || 0
    const currentTimeStr = formatTime(currentTimeSecs)


    return (
        <div className="audio-player" >
            <Flex gap="small" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>

                <a className={`play-button${!canPlay || !enabled ? " disabled" : ""}`}
                    onClick={play}>
                    <FontAwesomeIcon
                        color={colorPrimary}
                        className='clickable-icon'
                        fixedWidth
                        icon={['fas', isPlaying ? "pause" : "play"]}
                    />
                </a>
                <div style={{ display: "inline" }}>{currentTimeStr} / {durationStr}</div>
                <Slider
                    style={{ minWidth: "100px" }}
                    min={0}
                    max={durationSecs}
                    tooltip={{ formatter }}
                    step={1}
                    value={currentTimeSecs}
                    onChange={v => setSeekValue(v) }
                    onChangeComplete={_ => onSeek(seekValue)}/>
            </Flex>

            <audio ref={audioRef} src={src ? src : undefined  }
                onError={(e)=> { console.log(e); setIsPlaying(false)}}
                onEnded={onAudioEnded}
                onTimeUpdate={onTimeUpdate}
                onCanPlayThrough={onCanPlay}/>
        </div>
    )
}

export default AudioPlayer