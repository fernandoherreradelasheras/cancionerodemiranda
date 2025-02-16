import { RefObject, useContext, useEffect, useRef, useState } from 'react'
import { TonoDef, TranscriptionEntry } from './utils'
import IntroView from './IntroView'
import MusicView from './MusicView'
import ImagesView from './ImagesView'
import Pdf from './Pdf'
import { Link } from 'react-router-dom'
import TonoRightPanel from './TonoRightPanel'
import { Context } from './Context'


const getStatusElement = (text: string, status: string) => {
    const className = "text-" + status.replace(' ', '-')
    return (
        <li>{text}<span className={className}>{status}</span>
        </li>
    )
}

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

    if (entry.append_to == undefined || entry.append_to == "@none") {
        return null
    }

    if (entry.append_to == "@custom") {
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

    const { definitions } = useContext(Context)    

    const [currentLeftPanel, setCurrentLeftPanel] = useState(getDefaultSection(tono))
    const [currentRightPanel, setCurrentRightPanel] = useState("")
    const [currentTonoNumber, setCurrentTonoNumber] = useState(tono.number)
    const [currentMusicSection, setCurrentMusicSection] = useState<string|undefined>()
    const [maxHeight, setMaxHeight] = useState(0)
    const [scoreMeasuresCount, setScoreMeasuresCount] = useState<number | null>(null)



    const leftPanelRef = useRef(null)


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

    const onScoreRendered = (numMeasures: number) => {
        setScoreMeasuresCount(numMeasures)
    }

    const leftActions = (
        <ul className="actions" style={{ flex: 3}}>
            {tono.introduction != null ?
                <li><Link to="#" onClick={showIntro} className={`button tono-action icon primary ${currentLeftPanel == "intro" ? "disabled" : ""}`}>Introducción</Link></li>
                : null}
            {tono.mei_file != null ?
                <li><Link to="#" onClick={showMusic} className={`button tono-action primary icon fa-solid fa-music ${currentLeftPanel == "music" ? "disabled" : ""}`}>Transcripción</Link></li>
                : null}
            <li><Link to="#" onClick={showImages} className={`button tono-action icon primary fa-regular fa-file-image ${currentLeftPanel == "images" ? "disabled" : ""}`}>Manuscrito</Link></li>
            <li><Link to="#" onClick={showPdf} className="button tono-action icon primary fa-regular fa-file-pdf">PDF</Link></li>
        </ul>
    )


    const musicInfo = (
        <ul className="small" style={{ alignSelf: "flex-end", flex: 1 }}>            
            <li><span>Número de compases: </span><span>{scoreMeasuresCount != null ? scoreMeasuresCount : ""}</span></li>
        </ul>
    )


    const rightActions = (
        <ul className="actions small" style={{ alignSelf: "flex-end", flex: 1 }}>
            {tono.text_transcription != null ?
                <li><Link to="#" onClick={() => setCurrentRightPanel("text")} className={`button small tono-action primary ${currentRightPanel == "text" ? "disabled" : ""}`}>Texto poético</Link></li>
                : null}
            {tono.music_comments_file != null ?
                <li><Link to="#" onClick={() => setCurrentRightPanel("music-comments")} className={`button small tono-action primary ${currentRightPanel == "music-comments" ? "disabled" : ""}`}>Notas ed. musical</Link></li>
                : null}
        </ul>
    )

    const actions = (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
            {leftActions}
            {currentLeftPanel == "music" ? musicInfo : <></> }
            {currentLeftPanel == "music" ? rightActions : <></>}
        </div>
    )

    const onSectionClicked = (section: string) => {
        setCurrentLeftPanel("music")
        setCurrentMusicSection(section)
    }


    const enableSectionLinks = tono.mei_file != undefined

    const status = (
        <div style={{display: "flex" }}>
            <div style={{flex: 3 }}>
                <h3 id="tono-autor-musica">Música: {tono.music_author}</h3>
                <h3 id="tono-autor-texto">Texto: {tono.text_author}</h3>
            </div>
            <div style={{flex: 2 }}>
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
            <div style={{flex: 3 }}>
                <ul id="tono-stats" className="alt">
                    {getStatusElement("Transcripción del texto:", tono.status_text_transcription)}
                    {getStatusElement("Revisión del texto:", tono.status_text_proof_reading)}
                    {getStatusElement("Validación del texto:", tono.status_text_validation)}
                </ul>
            </div>
            <div style={{flex: 3 }}>
                <ul id="tono-estado-musica" className="alt">
                    {getStatusElement("Transcripción de la música:", tono.status_music_transcription)}
                    {getStatusElement("Revisión de la música:", tono.status_music_proof_reading)}
                    {getStatusElement("Validación de la música:", tono.status_music_validation)}
                </ul>
            </div>
        </div>
    )

    function leftPanelElement () {
        if (currentLeftPanel == "intro") {
            return (<IntroView tono={tono} />)
        } else if (currentLeftPanel == "music") {
            return (<MusicView  tono={tono}  maxHeight={maxHeight} section={currentMusicSection} onScoreRendered={onScoreRendered}  />)
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
        const icon = ( <i className="icon fa-solid fa-left-long fa-lg"></i> )
        return tono.number <= 1
            ?  ( <Link to="#" className="button nav-button tono-action small disabled">{icon} Tono anterior</Link> )
            :  ( <Link to={`/tono/${tono.number - 1}`} className="button nav-button tono-action small">{icon} Tono anterior</Link> )
    }

    const navLinkNext = () => {
        const icon = ( <i className="icon fa-solid fa-right-long fa-lg"></i> )
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
                    const maxHeight = Math.round(window.innerHeight - clientRect.top - 100)
                    setMaxHeight(maxHeight)
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
                <header className="main" style={{display: "flex" }}>
                    <div style={{ flex: 1 }}>{navLinkPrev()}</div>
                    <h2 className="tono-titulo" >Tono nº{tono.number}: {tono.title}</h2>
                    <div style={{ flex: 1 }}>  </div>
                    <div style={{ flex: 0 }}>{navLinkNext()}</div>
                </header>

                {status}

                {actions}

                <div ref={leftPanelRef} style={{ display: "flex", flexDirection: "row" }} >
                    {leftPanelElement()}
                    <TonoRightPanel maxHeight={maxHeight}  panel={currentRightPanel} tono={tono} onPanelClose={() => setCurrentRightPanel("")}/>                                             
                </div>

            </section>
        </div>
    )
}

export default TonoView

