import { useState, useRef } from "react";


function AudioPlayer ({src, timeMap, enabled, onMidiUpdate} : { 
    src: string | undefined,
    timeMap: any,
    enabled: boolean,
    onMidiUpdate: (playing: boolean, off: string[], on: string[]) => void
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

    if (audioRef.current != null) {
        if (isPlaying && audioRef.current.paused) {
          audioRef.current.play()
          setTimeMapIndex(0)        
        } else if (!isPlaying && !audioRef.current.paused) {
            audioRef.current.pause();
        }
    }

    const audioProgress = timeMap != null ? timeMapIndex / timeMap.length * 100 : 0
    

    return (
        <div className="audio-player" style={{border:"solid 1px"}}>
            <ul className="actions" style={{ flex: 1 }}>
                <li>
                    <a className={`button small icon primary fa-solid ${isPlaying ? "fa-pause" : "fa-play"} ${!canPlay || !enabled ? "disabled" : ""}`}
                        onClick={play}></a>
                </li>
                <progress value={audioProgress} max="100"></progress>
            </ul>
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