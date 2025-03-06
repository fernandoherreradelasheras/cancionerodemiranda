import { TonoDef, getTonoUrl } from "./utils"
import Verovio from "./Verovio"


function MusicView({ tono, section, onNotesUpdated }: {
    tono: TonoDef,
    section: string | undefined,
    onNotesUpdated: (notes: string[]) => void
}) {

    const tonoUrl = getTonoUrl(tono.path, tono.mei_file)

    const attributes: any = {
        mei_url: tonoUrl,
        onNotesUpdated: onNotesUpdated
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