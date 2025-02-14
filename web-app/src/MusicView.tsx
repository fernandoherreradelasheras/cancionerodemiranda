import { TonoDef, repoRoot } from "./utils"
import Verovio from "./Verovio";




function MusicView({ tono, maxHeight}: {
    tono: TonoDef,
    maxHeight: number | undefined
}) {


    const tonoUrl = repoRoot + tono.path + "/" + tono.mei_file;
    const attributes: any = {
        mei_url: tonoUrl,
        maxHeight: maxHeight,
        style: { flex: 1, width: "100%", height: maxHeight }
    }

    return (
        <Verovio {...attributes} />
    )
}
export default MusicView