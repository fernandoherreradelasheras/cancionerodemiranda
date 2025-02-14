import { TonoDef, repoRoot } from "./utils"

import { useEffect, useState } from 'react'
import LatexView from './LatexView';


const getText = async (url: string) => {
    const response = await fetch(url);
    return response.text();
};

const getTitle = (type: string | undefined) => {
    if (type == "coplas") 
        return "\n\\textbf{Coplas}\n"
    else if (type == "estribillo")
        return "\n\\textbf{Estribillo}\n"
    else return ""
}


function TextView({ tono }: { tono: TonoDef }) {

    const [text, setText] = useState<string>("");

    useEffect(() => {
        const fetchText = async () => {
            var newText = "";
            for (let transcription of tono.text_transcription) {
                const url = repoRoot + tono.path + "/" + transcription.file;
                const response = await getText(url);
                newText += getTitle(transcription.type) + "<em>" + response + "</em>";
            }
            if (tono.text_comments_file != null) {
                const url = repoRoot + tono.path + "/" + tono.text_comments_file;
                const response = await getText(url);
                newText += "\n\\subsection*{Notas al texto}" + response;
            }
            setText(newText);
        };
        fetchText();
    }, []);

    return (
        <LatexView text={text}/>
    )
}

export default TextView