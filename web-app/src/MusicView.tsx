import { TonoDef, repoRoot } from "./utils"
import Verovio from "./Verovio";




function MusicView({ tono, maxHeight, section, onScoreRendered}: {
    tono: TonoDef,
    maxHeight: number | undefined,
    section: string | undefined,
    onScoreRendered:  (numMeasures: number) => void
}) {


    const tonoUrl = repoRoot + tono.path + "/" + tono.mei_file;
    
    const attributes: any = {
        mei_url: tonoUrl,
        maxHeight: maxHeight,
        style: { flex: 1, width: "100%", height: maxHeight },
        onScoreRendered: onScoreRendered
    }
    if (section != undefined) {
        attributes.section = section
    }
    if (tono.mp3_file != undefined) {
        attributes.mp3_url = tono.mp3_file
    }
    return (
        <Verovio {...attributes} />
    )
}
export default MusicView