import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'



const getText = async (url: string) => {
    const response = await fetch(url)
    return response.text()
};


function IntroView({ introductionFile }: { introductionFile: string }) {

    const [intro, setIntro] = useState<string|null>(null);

    useEffect(() => {
        const fetchIntro = async () => {
            const text = await getText(introductionFile)
            setIntro("## Introducción\n\n" + text)
        };
        fetchIntro()
    }, []);

    return (
        <div style={{ maxWidth: "1200px"}}>
            <Markdown remarkPlugins={[remarkGfm]}>{intro}</Markdown>
        </div>

    )
}
export default IntroView
