import { useState, useRef } from "react";

import { library } from '@fortawesome/fontawesome-svg-core'

import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { PCOLOR } from "./utils";


const str2padded = (n: number) => (Math.floor(n)).toString().padStart(2, '0')

const formatTime = (secs: number) => `${str2padded(secs / 60)}:${str2padded(secs % 60)}`

library.add(faPause, faPlay)


function AudioPlayer ({src, timeMap, enabled, onMidiUpdate, onMidiSeek} : {
    src: string | undefined,
    timeMap: any,
    enabled: boolean,
    onMidiUpdate: (playing: boolean, off: string[], on: string[]) => void,
    onMidiSeek: (nextElement: string) => void
}) {

    const [canPlay, setCanPlay] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [timeMapIndex, setTimeMapIndex] = useState(0)


    const audioRef = useRef<HTMLAudioElement>(null)


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
        onMidiUpdate(isPlaying, offElements, onElements)
    }

    const onAudioEnded = (_: any) => {
        setTimeMapIndex(0)
        setIsPlaying(false)
        onMidiUpdate(false, [], [])
    }

    const onSeek = (event: any) => {
        if (audioRef.current != null && event.target?.value != null) {
            const newSecs = event.target.value
            audioRef.current.currentTime = newSecs
            var i = 0
            while  (Math.floor(parseInt(timeMap[i]['tstamp']) / 1000) <= newSecs) {
                i++
            }
            setTimeMapIndex(i)
            let nextElement
            while ((nextElement = timeMap[i]?.on[0]) == null) {
                i++
            }
            onMidiSeek(nextElement)
        }
    }

    if (audioRef.current != null) {
        if (isPlaying && audioRef.current.paused) {
          audioRef.current.play()
          setTimeMapIndex(0)
        } else if (!isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    }

    const audioProgress = timeMap != null ? timeMapIndex / timeMap.length  : 0
    const durationSecs = typeof audioRef.current?.duration == "number" && audioRef.current?.duration >= 0 ? Math.floor(audioRef.current?.duration) : 0
    const durationStr = formatTime(durationSecs)
    const currentTimeStr = formatTime(durationSecs * audioProgress)


    return (
        <div className="audio-player">
            <div className="controls">

                <a className={`play-button${!canPlay || !enabled ? " disabled" : ""}`}
                    onClick={play}>
                    <FontAwesomeIcon
                        color={PCOLOR}
                        className='clickable-icon'
                        fixedWidth
                        icon={['fas', isPlaying ? "pause" : "play"]}
                    />
                </a>
                <span className="time">{currentTimeStr} / {durationStr}</span>
                <input step="any" className="seek-bar"
                    /*
                    // @ts-ignore */
                    part="seek-bar"
                    type="range" min="0"
                    max={durationSecs}
                    value={durationSecs * audioProgress}
                    onChange={onSeek} />
            </div>

            <audio ref={audioRef} src={src}
                onError={(e)=> console.log(e)}
                onEnded={onAudioEnded}
                onTimeUpdate={onTimeUpdate}
                onCanPlayThrough={onCanPlay}
                onLoadedData={() => console.log("loaded data")}  />
        </div>
    )
}

export default AudioPlayer