import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { getTonoUrl, TonoDef } from "./utils"




const getText = async (url: string) => {
    const response = await fetch(url)
    return response.text()
};


function IntroView({ tono }: { tono: TonoDef }) {

    const [intro, setIntro] = useState<string|null>(null);

    useEffect(() => {
        const fetchIntro = async () => {
            const url = getTonoUrl(tono.path , tono.introduction)
            const text = await getText(url)
            setIntro("## Introducción\n\n" + text)
        };
        fetchIntro()
    }, []);

    return (
        <div>
            <Markdown remarkPlugins={[remarkGfm]}>{intro}</Markdown>
        </div>
        
    )
}
export default IntroView
