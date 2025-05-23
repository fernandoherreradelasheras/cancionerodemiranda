import { useEffect, useState } from 'react'
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from 'rehype-raw'
import { LyricItem } from 'score-viewer';

const TEXT_COMMENTS_HEADER = "## Notas al texto\n\n"


const getTitle = (lyric: LyricItem) => {
    if (lyric.title != undefined)
        return `\n### ${lyric.title}\n\n`
    else if (lyric.title == "estribillo")
        return "\n### Estribillo\n\n"
    else return ""
}


function TextView({ lyricsItems, comments }: {  lyricsItems: LyricItem[] | null | undefined, comments: string | null | undefined}) {

    const [text, setText] = useState<string>("");

    useEffect(() => {
        if (lyricsItems == null) {
            return
        }
        var newText = "";
        var lineNumber = 0
        for (let item of lyricsItems) {
            newText += getTitle(item)
            for (let line of item.text.split('\n')) {
                if (line == "") {
                    newText = newText.slice(0, -2) + "\n\n"
                } else if (line.startsWith("%")) {
                    continue
                } else {
                    lineNumber += 1
                    if (lineNumber % 5 == 0) {
                        newText += `*${line}*<span style="float: right; margin-right: -20px;" > ${lineNumber}</span>\\\n`
                    } else {
                        newText += `*${line}*\\\n`
                    }
                }
            }
        }
        if (comments) {
            newText += TEXT_COMMENTS_HEADER
            newText += comments
        }
        setText(newText);
    }, [lyricsItems, comments]);

    return (
        <div style={{ display: "flex", flexDirection: "row" }}>
        <div className="text-view">
            <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{text}</Markdown>
        </div>
        </div>
    )
}

export default TextView