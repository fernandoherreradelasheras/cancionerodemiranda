import { useState, useEffect } from 'react';
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'




function IntroView({ introduction }: { introduction: string | null | undefined }) {

    const [intro, setIntro] = useState<string | null>(null);

    useEffect(() => {
        if (introduction) {
            setIntro("## Introducción\n\n" + introduction)
        }
    }, [introduction]);

    return (
        <div style={{ maxWidth: "1200px" }}>
            <Markdown remarkPlugins={[remarkGfm]}>{intro}</Markdown>
        </div>

    )
}
export default IntroView
