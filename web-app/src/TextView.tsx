import { TonoDef, TranscriptionEntry, getTonoUrl } from "./utils"

import { useEffect, useState } from 'react'
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";


const getText = async (url: string) => {
    const response = await fetch(url);
    return response.text();
};

const getTitle = (transcription: TranscriptionEntry) => {
    if (transcription.name != undefined) 
        return `\n### ${transcription.name}\n\n`
    else if (transcription.type == "estribillo")
        return "\n### Estribillo\n\n"
    else return ""
}


function TextView({ tono }: { tono: TonoDef }) {

    const [text, setText] = useState<string>("");

    useEffect(() => {
        const fetchText = async () => {
            var newText = "";
            for (let transcription of tono.text_transcription) {
                newText += getTitle(transcription) 
                const url = getTonoUrl(tono.path, transcription.file)
                const response = await getText(url)                
                for (let line of response.split('\n')) {
                    if (line == "") {
                        newText = newText.slice(0, -2) + "\n\n"
                    } else {
                        newText += `*${line}*\\\n`
                    }
                }
            }
            if (tono.text_comments_file != null) {
                const url = getTonoUrl(tono.path ,tono.text_comments_file)
                const response = await getText(url)
                newText += "## Notas al texto\n\n" + response
            }
            setText(newText);
        };
        fetchText();
    }, []);

    return (
        <div>
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
        </div>
    )
}

export default TextView