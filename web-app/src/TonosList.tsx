import { TonoStatus } from './utils'
import { Link } from 'react-router-dom';
import { useGlobalContext } from './Context';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faFileLines, faMarker, faMusic, faHighlighter, faHeadphones,
    faListCheck, faFeatherPointed, faGuitar, faPersonBooth,
    faAlignJustify, faStamp
} from '@fortawesome/free-solid-svg-icons'
import { ScoreViewerConfigScore } from 'score-viewer';


library.add(faFileLines, faMarker, faMusic, faHighlighter,
    faHeadphones, faListCheck, faFeatherPointed,
    faGuitar, faPersonBooth, faAlignJustify, faStamp)

function tonoHasMusic(tonoConfig: ScoreViewerConfigScore | null) {
    if (tonoConfig == null) {
        return false
    } else {
        return (tonoConfig.meiFile != undefined && tonoConfig.meiFile != '');
    }
}

function tonoHasIntro(tono: ScoreViewerConfigScore | null) {
    if (tono == null) {
        return false
    } else {
        return (tono.introductionFile != undefined && tono.introductionFile.length > 0)
    }
}

function tonoHasText(tono: ScoreViewerConfigScore | null) {
    if (tono == null) {
        return false
    } else {
        return (tono.text != undefined && tono.text.length > 0)
    }
}

function tonoHasTextCompleted(tono: TonoStatus | null) {
        return (tono?.status_text == "transcription completed"  || tono?.status_text == "reviewed"
                ||  tono?.status_text == "completed")
}

function tonoHasTextValidated(tono: TonoStatus | null) {
    return (tono?.status_text == "reviewed")
}

function tonoHasMusicTranscriptionCompleted(tono: TonoStatus | null) {
    return (tono?.status_music == "transcription completed" ||
            tono?.status_music == "all voices completed" ||
            tono?.status_music == "reviewed" ||
            tono?.status_music == "completed")
}

function tonoHasMusicVoiceReconstructed(tono: TonoStatus | null) {
    return (tono?.status_music == "all voices completed"  ||
            tono?.status_music == "reviewed" ||
            tono?.status_music == "completed")
}

function tonoHasAudio(tono: ScoreViewerConfigScore | null) {
    return (tono?.audioBaseFile != undefined && tono?.audioBaseFile != null)
}

function tonoHasMusicValidated(tono: TonoStatus | null) {
    return (tono?.status_music == "reviewed")
}


function getAuthors(tonoStatus: TonoStatus) {
    let music
    let text

    if (tonoStatus.music_author && tonoStatus.music_author != "Anónimo") {
        music = <span><FontAwesomeIcon className="author-icon" title="autor de la música" icon={faGuitar} size="sm"/> {tonoStatus.music_author}</span>
    }
    if (tonoStatus.text_author && tonoStatus.text_author != "Anónimo") {

        text = <span><FontAwesomeIcon  className="author-icon" title="autor del texto" icon={faFeatherPointed} size="sm"/> {tonoStatus.text_author}</span>
    }
    return text != undefined || music != undefined ?
        <>. {music}{text}</>
        : null
}

const TextReviewedIcon = ({opacity, title}: {opacity: number, title: string}) =>
    <span className="fa-layers fa-fw fa-xl" title={title}>
        <FontAwesomeIcon className="status-icon" icon={faAlignJustify} transform="shrink-3" opacity={opacity}/>
        <FontAwesomeIcon className="status-icon" icon={faStamp} inverse transform="shrink-9 down-6 right-4" opacity={opacity} />
    </span>

const MusicReviewedIcon = ({opacity, title}: {opacity: number, title: string}) =>
    <span className="fa-layers fa-fw fa-xl" title={title}>
        <FontAwesomeIcon className="status-icon" icon={faMusic} transform="shrink-3" opacity={opacity}/>
        <FontAwesomeIcon className="status-icon" icon={faStamp} inverse transform="shrink-9 down-6 right-8" opacity={opacity} />
    </span>




const TonoItem = ({ tonoConfig, tonoStatus, index }: { tonoConfig: ScoreViewerConfigScore, tonoStatus: TonoStatus, index: number }) => {

    const hasIntro = tonoHasIntro(tonoConfig)
    const hasText = tonoHasText(tonoConfig)
    const textCompleted = tonoHasTextCompleted(tonoStatus)
    const textValidated = tonoHasTextValidated(tonoStatus)
    const hasMusic = tonoHasMusic(tonoConfig)
    const musicTranscriptionCompleted = tonoHasMusicTranscriptionCompleted(tonoStatus)
    const voiceReconstructed = tonoHasMusicVoiceReconstructed(tonoStatus)
    const hasAudio = tonoHasAudio(tonoConfig)
    const musicValidated = tonoHasMusicValidated(tonoStatus)


    const introInfo = hasIntro ? "introducción" : "sin introducción"
    const textInfo = hasText ? "texto transcrito" : "texto sin transcribir"
    const coplasInfo = textCompleted ? "todas las coplas alineadas" : "coplas por alinear"
    const textValidatedInfo = textValidated ? "texto validado" : "texto por validar"
    const musicInfo = hasMusic ? "transcripción musical iniciada" : "transcripción musical no comenzada"
    const transcriptionInfo = musicTranscriptionCompleted ? "transcripción musical finalizada" : "transcripción musical por concluir"
    const reconstructionInfo = voiceReconstructed ? "voz perdida reconstruida" : "voz perdida no reconstruida"
    const audioInfo = hasAudio ? "demo audio disponible" : "sin demo de audio"
    const musicValidatedInfo = musicValidated ? "música validada" : "música por validar"


    return (
        <li className="tono-list-item"  style={{paddingBottom: "1.4em"}}>
            <Link  className="item-tono-status" to={`/tono/${index + 1}`} state={{ tono: tonoConfig }}>
                <div  style={{marginTop: "0.2em", marginBottom: "0.2em"}}>
                    <span className="tono-title">{index + 1}. {tonoConfig?.title}</span>{getAuthors(tonoStatus)}
                </div>
                <div style={{display: "flex", flexDirection: "row", alignSelf: "center", fontSize: "1.2em" }}>
                    <FontAwesomeIcon className="status-icon" opacity={ hasIntro ? 1.0 : 0.3 } title={introInfo} icon={faPersonBooth} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ hasText ? 1.0 : 0.3 } title={textInfo} icon={faFileLines} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ textCompleted ? 1.0 : 0.3 } title={coplasInfo} icon={faMarker} size="xl"/>
                    <TextReviewedIcon opacity={ textValidated ? 1.0 : 0.3 } title={textValidatedInfo}/>
                    <FontAwesomeIcon className="status-icon" opacity={ hasMusic ? 1.0 : 0.3 } title={musicInfo} icon={faMusic} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ musicTranscriptionCompleted ? 1.0 : 0.3 } title={transcriptionInfo} icon={faHighlighter} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ voiceReconstructed ? 1.0 : 0.3 } title={reconstructionInfo} icon={faListCheck} size="xl"/>
                    <FontAwesomeIcon className="status-icon" opacity={ hasAudio ? 1.0 : 0.3 } title={audioInfo} icon={faHeadphones} size="xl"/>
                    <MusicReviewedIcon opacity={ musicValidated ? 1.0 : 0.3 } title={musicValidatedInfo}/>

                </div>
            </Link>
        </li>
    )
}



const TonosList = () => {

    const { scoreViewerConfig, status: definitions } = useGlobalContext()

    const listItems = scoreViewerConfig?.scores && definitions?.length ? scoreViewerConfig?.scores?.map((tonoConfig: ScoreViewerConfigScore, index: number) =>
        <TonoItem tonoConfig={tonoConfig} tonoStatus={definitions![index]} index={index} key={index}  />)
     : null


    return (

        <ul className="alt tono-list">
            { listItems}
        </ul>
    );
};

export default TonosList;
