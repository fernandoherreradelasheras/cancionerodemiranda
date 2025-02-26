import { useContext } from 'react'
import { TonoDef } from './utils'
import { Link } from 'react-router-dom';
import { Context } from './Context';
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFileLines, faMarker, faMusic, faHighlighter } from '@fortawesome/free-solid-svg-icons'

library.add( faFileLines, faMarker, faMusic, faHighlighter)




function tonoOveralStatus(tono: TonoDef | null) {
    if (tono == null) {
        return null;
    }

    if (tono.status_text == "completed" &&
        tono.status_music == "completed") {
        return (
            <span className="item-completed">completed</span>
        )
    } else if (tono.status_text == "not started" &&
        tono.status_music == "not started") {
        return (
            <span className="item-not-started">not started</span>
        )
    } else {
        return (
            <span className="item-in-progress">in progress</span>

        )
    }
}


function tonoHasMusic(tono: TonoDef | null) {
    if (tono == null) {
        return ""
    } else {
        return (tono['mei_file'] != undefined && tono['mei_file'] != '');
    }
}

function tonoHasText(tono: TonoDef | null) {
    if (tono == null) {
        return ""
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
            tono?.status_music == "lost voice reconstructed" ||
            tono?.status_music == "reviewed" ||
            tono?.status_music == "completed")
}




const TonoItem = ({ tono, index }: { tono: TonoDef, index: number }) => {

    return (
        <li className="tono-list-item">
            <Link  className="item-tono-status" to={`/tono/${index + 1}`} state={{ tono: tono }}>{index + 1}. {tono?.title}:
                {tonoOveralStatus(tono)}
                {tonoHasText(tono) ? <FontAwesomeIcon title="transcripción del texto" icon={faFileLines} size="xl"/> : null}
                {tonoHasTextCompleted(tono) ? <FontAwesomeIcon title="todas las coplas codificadas" icon={faMarker} size="xl"/> : null}
                {tonoHasMusic(tono) ?  <FontAwesomeIcon title="transcripción musical iniciada" icon={faMusic} size="xl"/> : null}
                {tonoHasMusicTranscriptionCompleted(tono) ?  <FontAwesomeIcon title="transcripción musical finalizada" icon={faHighlighter} size="xl"/> : null}
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
