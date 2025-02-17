import { TonoDef, getTonoUrl } from "./utils"
import Verovio from "./Verovio";



function MusicView({ tono, maxHeight, section }: {
    tono: TonoDef,
    maxHeight: number | undefined,
    section: string | undefined
}) {

    

    const tonoUrl = getTonoUrl(tono.path, tono.mei_file)
    console.log(tonoUrl)
    
    const attributes: any = {
        mei_url: tonoUrl,
        maxHeight: maxHeight,
        style: { flex: 1, width: "100%", height: maxHeight }
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