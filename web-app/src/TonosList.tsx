import { TonoStatus } from './utils'
import { Link } from 'react-router-dom';
import { useGlobalContext } from './Context';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faFileLines, faMarker, faMusic, faHighlighter, faHeadphones,
    faListCheck, faFeatherPointed, faGuitar, faPersonBooth,
    faAlignJustify, faStamp,
    IconDefinition
} from '@fortawesome/free-solid-svg-icons'
import { ScoreViewerConfigScore } from 'score-viewer';
import {
    tonoHasMusic,
    tonoHasIntro,
    tonoHasText,
    tonoHasTextCompleted,
    tonoHasTextValidated,
    tonoHasMusicTranscriptionCompleted,
    tonoHasMusicVoiceReconstructed,
    tonoHasAudio,
    tonoHasMusicValidated
} from './utils';
import { List } from 'antd';


library.add(faFileLines, faMarker, faMusic, faHighlighter,
    faHeadphones, faListCheck, faFeatherPointed,
    faGuitar, faPersonBooth, faAlignJustify, faStamp)

function getAuthors(tonoStatus: TonoStatus) {
    let music
    let text

    if (tonoStatus.music_author && tonoStatus.music_author != "Anónimo") {
        music = <span><FontAwesomeIcon className="author-icon" title="autor de la música" icon={faGuitar} size="sm" /> {tonoStatus.music_author}</span>
    }
    if (tonoStatus.text_author && tonoStatus.text_author != "Anónimo") {

        text = <span><FontAwesomeIcon className="author-icon" title="autor del texto" icon={faFeatherPointed} size="sm" /> {tonoStatus.text_author}</span>
    }
    return text != undefined || music != undefined ?
        <>. {music}{text}</>
        : null
}

const createFaStatusIcon = (
    condition: boolean,
    trueTitle: string,
    falseTitle: string,
    iconDefinition: IconDefinition,
) => <FontAwesomeIcon
        className="status-icon"
        opacity={condition ? 1.0 : 0.3}
        title={condition ? trueTitle : falseTitle}
        icon={iconDefinition}
        size="xl"
    />

const createCustomStatusIcon = (
    condition: boolean,
    trueTitle: string,
    falseTitle: string,
    type: "textReviewed" | "musicReviewed",
) => {
    const opacity = condition ? 1.0 : 0.3
    const title = condition ? trueTitle : falseTitle
    const icon1 = type === 'textReviewed' ? faAlignJustify : faMusic
    const stampTransform = `shrink-9 down-6 right-${type === 'textReviewed' ? 4 : 8}`

    return (<span className="fa-layers fa-fw fa-xl" title={title}>
        <FontAwesomeIcon className="status-icon" icon={icon1} transform="shrink-3" opacity={opacity} />
        <FontAwesomeIcon className="status-icon" icon={faStamp} inverse transform={stampTransform} opacity={opacity} />
    </span>)
}


const StatusIcons = ({ tonoConfig, tonoStatus }: { tonoConfig: ScoreViewerConfigScore, tonoStatus: TonoStatus }) =>
    <div className="icon-list" style={{ display: "flex", flexDirection: "row", alignSelf: "center", fontSize: "1.2em" }}>
        {createFaStatusIcon(tonoHasIntro(tonoConfig), "introducción", "sin introducción", faPersonBooth)}
        {createFaStatusIcon(tonoHasText(tonoConfig), "texto transcrito", "texto sin transcribir", faFileLines)}
        {createFaStatusIcon(tonoHasTextCompleted(tonoStatus), "todas las coplas alineadas", "coplas por alinear", faMarker)}
        {createCustomStatusIcon(tonoHasTextValidated(tonoStatus), "texto validado", "texto por validar", 'textReviewed')}
        {createFaStatusIcon(tonoHasMusic(tonoConfig), "transcripción musical iniciada", "transcripción musical no comenzada", faMusic)}
        {createFaStatusIcon(tonoHasMusicTranscriptionCompleted(tonoStatus), "transcripción musical finalizada", "transcripción musical por concluir", faHighlighter)}
        {createFaStatusIcon(tonoHasMusicVoiceReconstructed(tonoStatus), "voz perdida reconstruida", "voz perdida no reconstruida", faListCheck)}
        {createFaStatusIcon(tonoHasAudio(tonoConfig), "demo audio disponible", "sin demo de audio", faHeadphones)}
        {createCustomStatusIcon(tonoHasMusicValidated(tonoStatus), "música validada", "música por validar", 'musicReviewed')}
    </div>



const TonoItem = ({ tonoConfig, tonoStatus, index }: { tonoConfig: ScoreViewerConfigScore, tonoStatus: TonoStatus, index: number }) => {

    return (
        <List.Item className="tono-list-item" style={{ paddingBottom: "1.4em" }}>
            <Link className="item-tono-status" to={`/tono/${index + 1}`} state={{ tono: tonoConfig }}>
                <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
                    <span className="tono-title">{index + 1}. {tonoConfig?.title}</span>{getAuthors(tonoStatus)}
                </div>
                <StatusIcons tonoConfig={tonoConfig} tonoStatus={tonoStatus} />
            </Link>
        </List.Item>
    )
}

const TonosList = () => {

    const { scoreViewerConfig, status: definitions } = useGlobalContext()

    if (!scoreViewerConfig?.scores || !definitions || definitions?.length <= 0) {
        return null
    }

    return (
        <List className="alt tono-list" >
            {scoreViewerConfig?.scores?.map((tonoConfig: ScoreViewerConfigScore, index: number) =>
                <TonoItem tonoConfig={tonoConfig} tonoStatus={definitions![index]} index={index} key={index} />
            )}
        </List>
    );
};

export default TonosList;
