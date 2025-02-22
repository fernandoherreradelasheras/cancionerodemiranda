import { useContext } from 'react'
import { TonoDef } from './utils'
import { Link } from 'react-router-dom';
import { Context } from './Context';



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
