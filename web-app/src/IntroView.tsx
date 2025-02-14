import { useEffect, useState } from 'react'
import LatexView from './LatexView';

import { TonoDef, repoRoot } from "./utils"




const getText = async (url: string) => {
    const response = await fetch(url);
    return response.text();
};


function IntroView({ tono }: { tono: TonoDef }) {

    const [intro, setIntro] = useState<string|null>(null);

    useEffect(() => {
        const fetchIntro = async () => {
            const url = repoRoot + tono.path + "/" + tono.introduction;
            const text = await getText(url);
            setIntro("\\section*{Introducción}" + text);
        };
        fetchIntro();
    }, []);

    return (
        <LatexView text={intro}/>
    )
}
export default IntroView
