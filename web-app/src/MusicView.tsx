import { TonoDef, getTonoUrl } from "./utils"
import Verovio from "./Verovio"
import mp3_files from "./assets/mp3-files.json"


type Mp3Files = {
    [key:string] : string
}

function MusicView({ tono, maxHeight, section }: {
    tono: TonoDef,
    maxHeight: number | undefined,
    section: string | undefined
}) {


    const tonoUrl = getTonoUrl(tono.path, tono.mei_file)
    
    const attributes: any = {
        tono: tono,
        mei_url: tonoUrl,
        maxHeight: maxHeight,
        style: { flex: 1, width: "100%", height: maxHeight }
    }

    if (section != undefined) {
        attributes.section = section
    }

    const mp3_file = (mp3_files as Mp3Files)[`${tono.number}`] 
    if (mp3_file != undefined) {
        attributes.mp3_url = mp3_file
    }

    return (
        <Verovio {...attributes} />
    )
}
export default MusicView