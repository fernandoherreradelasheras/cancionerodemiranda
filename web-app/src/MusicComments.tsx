import { TonoDef, repoRoot } from "./utils"

import { useEffect, useState } from 'react'
import LatexView from './LatexView';


const getUrl = async (url: string) => {
    const response = await fetch(url);
    return response.text();
};




function MusicComments({ tono }: { tono: TonoDef }) {

    const [comments, setComments] = useState<string|null>(null);    

    useEffect(() => {
        const fetchComments = async () => {
            const url = repoRoot + tono.path + "/" + tono.music_comments_file;
            const text = await getUrl(url);

            setComments(text.trimStart());
        };

        if (tono.music_comments_file) {
            fetchComments()
        }
    }, [tono]);

    return (
        <LatexView text={comments}/>
    )
}

export default MusicComments