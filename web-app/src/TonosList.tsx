import { useContext } from 'react'
import { TonoDef } from './utils'
import { Link } from 'react-router-dom';
import { Context } from './Context';



function statusStarted(status: string) {
    return (status == "in progress" || status == "completed");
}

function tonoOveralStatus(tono: TonoDef | null) {
    if (tono == null) {
        return null;
    }

    if (tono.status_text_transcription == "completed" &&
        tono.status_text_proof_reading == "completed" &&
        tono.status_text_validation == "completed" &&
        tono.status_music_transcription == "completed" &&
        tono.status_music_proof_reading == "completed" &&
        tono.status_music_validation == "completed" &&
        tono.status_poetic_study == "completed" &&
        tono.status_musical_study == "completed") {

        return (
            <span className="item-completed">completed</span>
        )
    } else if (statusStarted(tono.status_text_transcription) ||
        statusStarted(tono.status_text_proof_reading) ||
        statusStarted(tono.status_text_validation) ||
        statusStarted(tono.status_music_transcription) ||
        statusStarted(tono.status_music_proof_reading) ||
        statusStarted(tono.status_music_validation) ||
        statusStarted(tono.status_poetic_study) ||
        statusStarted(tono.status_musical_study)) {
        return (
            <span className="item-in-progress">in progress</span>
        )
    } else {
        return (
            <span className="item-not-started">not started</span>
        )
    }
}



function tonoHasMusic(tono: TonoDef | null) {
    if (tono == null) {
        return ""
    } else {
        return (statusStarted(tono['status_music_transcription']) && tono['mei_file'] != undefined && tono['mei_file'] != '');
    }
}

function tonoHasText(tono: TonoDef | null) {
    if (tono == null) {
        return ""
    } else {
        return (statusStarted(tono['status_text_transcription']) &&
            tono.text_transcription != undefined && tono.text_transcription.length > 0)
    }
}

function tonoHasTextComments(tono: TonoDef | null) {
    if (tono == null) {
        return ""
    } else {
        return tono.text_comments_file != undefined
    }
}

function tonoHasMusicComments(tono: TonoDef | null) {
    if (tono == null) {
        return ""
    } else {
        return tono.music_comments_file != undefined
    }
}




const TonoItem = ({ tono, index }: { tono: TonoDef, index: number }) => {

    return (
        <li>
            <Link  className="item-tono-status" to={`/tono/${index + 1}`} state={{ tono: tono }}>{index + 1}. {tono?.title}:
                {tonoOveralStatus(tono)}
                <span> </span>
                {tonoHasText(tono) ? <span className="icon fa-regular fa-file-lines"></span> : null}
                <span> </span>
                {tonoHasTextComments(tono) ? <span className="icon fa-solid fa-marker"></span> : null}
                <span> </span>
                {tonoHasMusic(tono) ? <span className="icon fa-solid fa-music"></span> : null}
                <span> </span>
                {tonoHasMusicComments(tono) ? <span className="icon fa-solid fa-highlighter"></span> : null}
            </Link> 
        </li>
    )
}



const TonosList = () => {


    const { definitions } = useContext(Context)
    

    const listItems = definitions.map((tono: TonoDef, index: number) => <TonoItem tono={tono} index={index} key={index}  />);

    return (

        <ul className="alt">
            {listItems}
        </ul>
    );
};

export default TonosList;
