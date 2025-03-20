import { useState, useRef, useEffect, useMemo } from "react";

import { library } from '@fortawesome/fontawesome-svg-core'

import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Flex, Slider, SliderSingleProps, theme } from "antd";
import useStore from "./store";


export enum PlayerEventType {
    ERROR,
    SEEK
}

export type PlayerEvent = {
    type: PlayerEventType,
    value?: any
}

const str2padded = (n: number) => (Math.floor(n)).toString().padStart(2, '0')

const formatTime = (millis: number) => {
    const mins = str2padded(millis / 1000 / 60)
    const secs = str2padded((millis / 1000) % 60)
    //console.log(`formatTime: ${millis} -> ${mins}:${secs}`)
    return `${mins}:${secs}`
 }

const formatter: NonNullable<SliderSingleProps['tooltip']>['formatter'] = (value) => formatTime(value ? value : 0)

library.add(faPause, faPlay)


function AudioPlayer ({ audioSrc, timeMap, onPlayerEvent } : {
    audioSrc: string,
    timeMap: any[],
    onPlayerEvent: (event: PlayerEvent) => void,
}) {

    const [canPlay, setCanPlay] = useState(false)
    const [seekValue, setSeekValue] = useState(0)
    const [timeString, setTimeString] = useState("00:00 / 00:00")

    const loading = useStore.getState().isLoading
    const playing = useStore.getState().playing
    const setPlaying = useStore.getState().setPlaying
    const playingPosition = useStore.getState().playingPosition
    const setPlayingPosition = useStore.use.setPlayingPosition()


    const audioRef = useRef<HTMLAudioElement>(null)


    const {
        token: { colorPrimary },
      } = theme.useToken();

    const onTimeUpdate = (e: any)  => {
        if (timeMap == null || timeMap.length == 0) {
            return
        }
        const playSecs = e.target.currentTime
        const playMilis = playSecs * 1000


        if (playMilis > timeMap[timeMap.length - 1]['tstamp']) {
            console.log(`Got a time update: ${e.target.currentTime} above the last entry in the timemap. Do audio end`)
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            }
            onAudioEnded(e)
            return
        }


        setPlayingPosition(playMilis)
    }

    const onAudioEnded = (_: any) => {
        setPlaying(false)
        onPlayerEvent({ type: PlayerEventType.SEEK, value: 0 })
    }

    const onSeek = (newSecs: number) => {
        if (audioRef.current == null) {
            return
        }
        audioRef.current.currentTime = newSecs
    }

    useEffect(() => {
        if (audioRef.current != null) {
            if (playing && audioRef.current.paused) {
                audioRef.current.play()
            } else if (!playing && !audioRef.current.paused) {
                audioRef.current.pause();
            }
        }
    }, [playing])

    const durationTimemap = useMemo(() => {
        const duration = timeMap.length > 0 ? timeMap[timeMap.length - 1]['tstamp'] : 0
        return duration
    }, [timeMap])


    useEffect(() => {
        // Use real file player duration to track the % progress
        // But render to the UI the timemap duration, as that is our source of truth for seeking into elements and so
        setSeekValue(playingPosition)

        if (durationTimemap > 0) {
            const durationStr = formatTime(durationTimemap)
            const currentTimeStr = formatTime(playingPosition)

            setTimeString(`${currentTimeStr} / ${durationStr}`)
        }

    }, [playingPosition, durationTimemap])

    const enabled = canPlay && timeMap.length > 0 && !loading

    return (
        <div className="audio-player" >

            <Flex gap="small" style={{ alignItems: 'center', justifyContent: 'flex-end' }}>

                <Button
                disabled={!enabled}
                    onClick={() => setPlaying(!playing) }>
                    <FontAwesomeIcon
                        color={colorPrimary}
                        className='clickable-icon'
                        fixedWidth
                        icon={['fas', playing ? "pause" : "play"]}
                    />
                </Button>
                <div style={{ display: "inline" }}>{timeString}</div>
                <Slider
                    style={{ minWidth: "200px" }}
                    min={0}
                    max={durationTimemap}
                    tooltip={{ formatter }}
                    step={1}
                    disabled={!enabled}
                    value={seekValue}
                    onChange={(v) => setSeekValue(v) }
                    onChangeComplete={(v) => {
                        onPlayerEvent({ type: PlayerEventType.SEEK, value: v })
                        onSeek(v/1000)
                    }}/>
            </Flex>

            <audio ref={audioRef} src={audioSrc ? audioSrc : undefined  }
                onError={(e)=> { console.log(e); onPlayerEvent({ type: PlayerEventType.ERROR, value: e })}}
                onEnded={onAudioEnded}
                onTimeUpdate={onTimeUpdate}
                onCanPlayThrough={(_) => setCanPlay(true)}/>
        </div>
    )
}

export default AudioPlayer