import { RefObject, useContext, useEffect, useRef, useState } from 'react'
import { MusicStatus, TextStatus, TonoDef, TranscriptionEntry } from './utils'
import IntroView from './IntroView'
import MusicView from './MusicView'
import ImagesView from './ImagesView'
import Pdf from './Pdf'
import { Link } from 'react-router-dom'
import TonoRightPanel from './TonoRightPanel'
import { Context } from './Context'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faFilePdf, faFileImage, faLeftLong, faRightLong } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'


library.add(faMusic, faFilePdf, faFileImage, faLeftLong, faRightLong)


const getProgressFromTextStatus = (status: TextStatus) => {
    switch(status) {
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return  { value: 25, text: "transcripción en progreso" }
        case "transcription completed": return  { value: 50, text: "transcripción completa" }
        case "reviewed": return  { value: 75, text: "revisado" }
    }
    return  { value: 100, text: "completado" }

}

const getProgressFromMusicStatus = (status: MusicStatus) => {
    switch(status) {
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return  { value: 20, text: "transcripción en progreso" }
        case "transcription completed": return  { value: 40, text: "transcripción completa" }
        case "all voices completed": return { value: 60, text: "todas las voces completas"}
        case "reviewed": return  { value: 80, text: "revisado" }
    }
    return  { value: 100, text: "completado" }
}

const getStatusElement = (title: string, textValue: string, value: number) => (
    <div className="progress-status-element"><span>{title}: {textValue}</span>
        <progress max="100" value={value} className={`status-progress progress-state-${value}`} />
    </div>
)



const getDefaultSection = (tono: TonoDef) => {
    if (tono.introduction != undefined)
        return "intro"
    else if (tono.mei_file != undefined)
        return "music"
    else
        return "images"
}

const transcriptionEntryToSection = (entry: TranscriptionEntry) => {
    if (entry.type != undefined) {
        if (entry.type == "single") {
            return "sección única"
        } else {
            return entry.type;
        }
    }

    if (entry.append_to == undefined) {
        return null
    } else if (entry.append_to == "@none") {
        return "coplas" //TODO: Verify this
    } else if (entry.append_to == "@custom") {
        return "@custom: TODO"
    } else {
        return entry.append_to
    }

    return null
}

const getDocument = (e:RefObject<any>) =>
    //@ts-ignore
    e.current.ownerDocument



const TonoView = ({ tono }: { tono: TonoDef }) => {

    const { definitions, useBreakpoint } = useContext(Context)

    const [currentLeftPanel, setCurrentLeftPanel] = useState(getDefaultSection(tono))
    const [currentRightPanel, setCurrentRightPanel] = useState("")
    const [currentTonoNumber, setCurrentTonoNumber] = useState(tono.number)
    const [currentMusicSection, setCurrentMusicSection] = useState<string|undefined>()
    const [maxHeight, setMaxHeight] = useState(0)
    const [musicNotes, setMusicNotes] = useState<string[]|null>(null)


    const leftPanelRef = useRef(null)

    const breakpoint = useBreakpoint()


    const showIntro = () => {
        setCurrentLeftPanel("intro")
        setCurrentRightPanel("")
    }

    const showMusic = () => {
        setCurrentMusicSection(undefined)
        setCurrentLeftPanel("music")
    }
    const showImages = () => {
        setCurrentLeftPanel("images")
        setCurrentRightPanel("")
    }
    const showPdf = () => {
        setCurrentLeftPanel("pdf")
        setCurrentRightPanel("")
    }

    const onNotesUpdated = (notes: string[]) => {
        setMusicNotes(notes)
    }


    const leftActions = (
        <ul className="actions tono-swicthes" style={{ flex: 3 }}>
            {tono.introduction != null ? <li>
                <Link to="#" onClick={showIntro} className={`button tono-action icon primary ${currentLeftPanel == "intro" ? "disabled" : ""}`}>
                        <span>Introducción</span>
                    </Link>
            </li> : null}
            {tono.mei_file != null ? <li>
                    <Link to="#" onClick={showMusic} className={`button tono-action primary ${currentLeftPanel == "music" ? "disabled" : ""}`}>
                        <FontAwesomeIcon
                            className='clickable-icon reverse-color'
                            icon={faMusic}
                            size="2x" />
                        <span>Transcripción</span>
                    </Link>
            </li> : null}
            <li>
                <Link to="#" onClick={showImages} className={`button tono-action primary ${currentLeftPanel == "images" ? "disabled" : ""}`}>
                    <FontAwesomeIcon
                        className='clickable-icon reverse-color'
                        icon={faFileImage}
                        size="2x" />
                    <span>Manuscrito</span>
                </Link>
            </li>
            <li>
                <Link to="#" onClick={showPdf} className="button tono-action primary">
                    <FontAwesomeIcon
                        className='clickable-icon reverse-color'
                        icon={faFilePdf}
                        size="2x" />
                    <span>PDF</span>
                </Link>
            </li>
        </ul>
    )



    const rightActions = (
        <ul className="actions small right-panel">
            {tono.text_transcription != null ?
                <li><Link to="#" onClick={() => setCurrentRightPanel("text")} className={`button small tono-action primary ${currentRightPanel == "text" ? "disabled" : ""}`}>Texto poético</Link></li>
                : null}
        </ul>
    )

    const actions = (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            {leftActions}
            {currentLeftPanel == "music" ? rightActions : <></>}
        </div>
    )

    const onSectionClicked = (section: string) => {
        setCurrentLeftPanel("music")
        setCurrentMusicSection(section)
    }

    const enableSectionLinks = tono.mei_file != undefined
    const { "value": textStatusValue , "text": textStatusText } = getProgressFromTextStatus(tono.status_text)
    const { "value": musicStatusValue , "text": musicStatusText } = getProgressFromMusicStatus(tono.status_music)


    const status = (
        <div className="status-area" >

            <div className="status-expand">
                <h3 id="tono-autor-musica">Música: {tono.music_author}</h3>
                <h3 id="tono-autor-texto">Texto: {tono.text_author}</h3>
            </div>
            <div className="status-no-expand">
                <ul id="tono-estado-texto" className="alt">
                <li><span style={{ fontWeight: "bolder"}}>Secciones:</span></li>
                    <ul>
                        {tono.text_transcription.map((entry: TranscriptionEntry) => transcriptionEntryToSection(entry))
                        .filter(e => e != null)
                        .map((section, index) => {
                            if (enableSectionLinks)
                                return <li key={index}><Link to="" onClick={() => onSectionClicked(section)}>{section}</Link></li>
                            else
                                return <li key={index}>{section}</li>
                        }
                    )}
                    </ul>
                </ul>
            </div>
            <div className="status-expand">
                <ul id="tono-stats" className="alt">
                    <li>{getStatusElement("Texto", textStatusText, textStatusValue)}</li>
                    <li>{getStatusElement("Música", musicStatusText, musicStatusValue)}</li>
                </ul>
            </div>
            <div className="status-expand">
                Pendiente:
                <ul id="tono-estado-musica" className="alt">
                    {musicNotes?.map((n, index) =>  <li key={index}>{n}</li>   )}
                </ul>
            </div>
        </div>
    )

    function leftPanelElement () {
        if (currentLeftPanel == "intro") {
            return (<IntroView tono={tono} />)
        } else if (currentLeftPanel == "music") {
            return (<MusicView  tono={tono}  maxHeight={maxHeight} section={currentMusicSection} onNotesUpdated={onNotesUpdated} />)
        } else if (currentLeftPanel == "images") {
            return (<ImagesView tono={tono} />)
        } else if (currentLeftPanel == "pdf") {
            return (<Pdf tono={tono} />)
        }
    }


    if (tono.number != currentTonoNumber) {
        // Looks like keeping the left panel on tono changes is more useful
        // as people would be quick browsing, so usually they would be interested
        // on the same content: the transcription, the facsimile or the intro text
        // So we change it only when that part is note available for the new tono
        if ((currentLeftPanel == "music" && tono.mei_file == undefined) ||
            (currentLeftPanel == "intro" && tono.introduction == undefined)) {
                setCurrentLeftPanel(getDefaultSection(tono))
        }
        setCurrentRightPanel("")
        setCurrentTonoNumber(tono.number)
    }


    const navLinkPrev = () => {
        const icon = <FontAwesomeIcon className='clickable-icon' icon={faLeftLong} size="2xl" />
        return tono.number <= 1
            ?  ( <Link to="#" className="button nav-button tono-action small disabled">{icon} Tono anterior</Link> )
            :  ( <Link to={`/tono/${tono.number - 1}`} className="button nav-button tono-action small">{icon} Tono anterior</Link> )
    }

    const navLinkNext = () => {
        const icon = <FontAwesomeIcon className='clickable-icon' icon={faRightLong} size="2xl" />
        return tono.number >= definitions.length
            ?  ( <Link to="#" className="button nav-button tono-action small disabled">Tono siguiente {icon}</Link> )
            :  ( <Link to={`/tono/${tono.number + 1}`} className="button nav-button tono-action small">Tono siguiente {icon}</Link> )
    }

    useEffect(() => {
        if (leftPanelRef.current) {
            const observer = new ResizeObserver((_) => {
                if (leftPanelRef.current) {
                    //@ts-ignore
                    const window = leftPanelRef.current.ownerDocument.defaultView;
                    //@ts-ignore
                    const clientRect = leftPanelRef.current.getBoundingClientRect()
                    if (breakpoint == "XL" || breakpoint == "L") {
                        setMaxHeight(Math.round(window.innerHeight - clientRect.top - 100))
                    } else {
                        setMaxHeight(window.innerHeight - 100)
                    }
                }

            });

           observer.observe(getDocument(leftPanelRef).body);

            // Cleanup function
            return () => {
                observer.disconnect();
            };
        }
    }, []);


    return (
        <div key={tono.number}>
            <section id="tono-informacion">
                <header className="main tono-header">
                    <div className="header-left">{navLinkPrev()}</div>
                    <h2 className="tono-titulo" >Tono nº{tono.number}: {tono.title}</h2>
                    <div className="header-spacer" >  </div>
                    <div className="header-right">{navLinkNext()}</div>
                </header>

                {status}

                {actions}

                <div ref={leftPanelRef} className="tono-left-panel" >
                    {leftPanelElement()}
                    <TonoRightPanel maxHeight={maxHeight}  panel={currentRightPanel} tono={tono} onPanelClose={() => setCurrentRightPanel("")}/>
                </div>

            </section>
        </div>
    )
}

export default TonoView

