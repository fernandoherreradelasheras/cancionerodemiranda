import { useContext } from 'react'
import { TonoDef } from './utils'
import { Link } from 'react-router-dom';
import { Context } from './Context';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFileLines, faMarker, faMusic, faHighlighter, faHeadphones, faListCheck, faFeatherPointed, faGuitar } from '@fortawesome/free-solid-svg-icons'

library.add( faFileLines, faMarker, faMusic, faHighlighter, faHeadphones, faListCheck, faFeatherPointed, faGuitar )



function tonoHasMusic(tono: TonoDef | null) {
    if (tono == null) {
        return false
    } else {
        return (tono['mei_file'] != undefined && tono['mei_file'] != '');
    }
}

function tonoHasText(tono: TonoDef | null) {
    if (tono == null) {
        return false
    } else {
        return (tono.text_transcription != undefined && tono.text_transcription.length > 0)
    }
}

function tonoHasTextCompleted(tono: TonoDef | null) {
        return (tono?.status_text == "transcription completed"  || tono?.status_text == "reviewed"
                ||  tono?.status_text == "completed")
}

function tonoHasMusicTranscriptionCompleted(tono: TonoDef | null) {
    return (tono?.status_music == "transcription completed" ||
            tono?.status_music == "all voices completed" ||
            tono?.status_music == "reviewed" ||
            tono?.status_music == "completed")
}

function tonoHasMusicVoiceReconstructed(tono: TonoDef | null) {
    return (tono?.status_music == "all voices completed"  ||
            tono?.status_music == "reviewed" ||
            tono?.status_music == "completed")
}

function tonoHasAudio(tono: TonoDef | null) {
    return (tono?.base_mp3_file != undefined && tono?.base_mp3_file != null)
}

function getAuthors(tono: TonoDef) {
    let music
    let text

    if (tono.music_author && tono.music_author != "Anónimo") {
        music = <span><FontAwesomeIcon className="author-icon" title="autor de la música" icon={faGuitar} size="sm"/> {tono.music_author}</span>
    }
    if (tono.text_author && tono.text_author != "Anónimo") {

        text = <span><FontAwesomeIcon  className="author-icon" title="autor del texto" icon={faFeatherPointed} size="sm"/> {tono.text_author}</span>
    }
    return text != undefined || music != undefined ?
        <>. {music}{text}</>
        : null
}



const TonoItem = ({ tono, index }: { tono: TonoDef, index: number }) => {

    const hasText = tonoHasText(tono)
    const textCompleted = tonoHasTextCompleted(tono)
    const hasMusic = tonoHasMusic(tono)
    const musicTranscriptionCompleted = tonoHasMusicTranscriptionCompleted(tono)
    const voiceReconstructed = tonoHasMusicVoiceReconstructed(tono)
    const hasAudio = tonoHasAudio(tono)

    const textInfo = hasText ? "texto transcrito" : "texto sin transcribir"
    const coplasInfo = textCompleted ? "todas las coplas alineadas" : "coplas por alinear"
    const musicInfo = hasMusic ? "transcripción musical iniciada" : "transcripción musical no comenzada"
    const transcriptionInfo = musicTranscriptionCompleted ? "transcripción musical finalizada" : "transcripción musical por concluir"
    const reconstructionInfo = voiceReconstructed ? "voz perdida reconstruida" : "voz perdida no reconstruida"
    const audioInfo = hasAudio ? "demo audio disponible" : "sin demo de audio"

    return (
        <li className="tono-list-item"  style={{paddingBottom: "1.4em"}}>
            <Link  className="item-tono-status" to={`/tono/${index + 1}`} state={{ tono: tono }}>
                <div  style={{marginTop: "0.2em", marginBottom: "0.2em"}}>
                    <span className="tono-title">{index + 1}. {tono?.title}</span>{getAuthors(tono)}
                </div>
                <div style={{display: "flex", flexDirection: "row", alignSelf: "center", fontSize: "1.2em" }}>
                    <FontAwesomeIcon className="status-icon" opacity={ hasText ? 1.0 : 0.3 } title={textInfo} icon={faFileLines} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ textCompleted ? 1.0 : 0.3 } title={coplasInfo} icon={faMarker} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ hasMusic ? 1.0 : 0.3 } title={musicInfo} icon={faMusic} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ musicTranscriptionCompleted ? 1.0 : 0.3 } title={transcriptionInfo} icon={faHighlighter} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ voiceReconstructed ? 1.0 : 0.3 } title={reconstructionInfo} icon={faListCheck} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ hasAudio ? 1.0 : 0.3 } title={audioInfo} icon={faHeadphones} size="xl"/>
                </div>
            </Link>
        </li>
    )
}



const TonosList = () => {


    const { definitions } = useContext(Context)

    const listItems = definitions.map((tono: TonoDef, index: number) => <TonoItem tono={tono} index={index} key={index}  />);

    return (

        <ul className="alt tono-list">
            {listItems}
        </ul>
    );
};

export default TonosList;
