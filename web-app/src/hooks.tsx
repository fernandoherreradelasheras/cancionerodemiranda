

export const installWindowHooks = (window: any, { onMouseEnterMusicNotesMeasureNumber, onMouseLeaveMusicNotesMeasureNumber, onMusicNotesMeasureNumberClick }: {
    onMouseEnterMusicNotesMeasureNumber: (m: number) => void,
    onMouseLeaveMusicNotesMeasureNumber: (m: number) => void,
    onMusicNotesMeasureNumberClick: (m: number) => void 
}) => {
    window.onMouseEnterMusicNotesMeasureNumber = onMouseEnterMusicNotesMeasureNumber
    window.onMouseLeaveMusicNotesMeasureNumber = onMouseLeaveMusicNotesMeasureNumber
    window.onMusicNotesMeasureNumberClick = onMusicNotesMeasureNumberClick
}

export const uninstallWindowHooks = (window: any, { onMouseEnterMusicNotesMeasureNumber, onMouseLeaveMusicNotesMeasureNumber, onMusicNotesMeasureNumberClick }: {
    onMouseEnterMusicNotesMeasureNumber: (m: number) => void,
    onMouseLeaveMusicNotesMeasureNumber: (m: number) => void,
    onMusicNotesMeasureNumberClick: (m: number) => void
}) => {
    if (window.onMouseEnterMusicNotesMeasureNumber == onMouseEnterMusicNotesMeasureNumber) {
        window.onMouseEnterMusicNotesMeasureNumber = undefined
    }
    if (window.onMouseLeaveMusicNotesMeasureNumber == onMouseLeaveMusicNotesMeasureNumber) {
        window.onMouseLeaveMusicNotesMeasureNumber = undefined
    }
    if (window.onMusicNotesMeasureNumberClick == onMusicNotesMeasureNumberClick) {
        window.onMusicNotesMeasureNumberClick = undefined
    }
}


export const addMeasureHoversForLatex = (text: string) => 
    text.replace(/<strong>Compás ([0-9]+)<\/strong>/g, "<strong class=\"measure-link\" onmouseover='onMouseEnterMusicNotesMeasureNumber($1)' \
        onmouseleave='onMouseLeaveMusicNotesMeasureNumber($1)' onclick='onMusicNotesMeasureNumberClick($1)'>Compás $1</strong>")

export const getSvgHighlightedMeasureStyle = (measure: number) => 
    `[data-n="${measure}"] .staff.bounding-box rect { fill:blue;stroke:pink;stroke-width:100;fill-opacity:0.3;stroke-opacity:0.9; }`


export const getSvgSelectedMeasureStyle = (measure: number) => 
    `[data-n="${measure}"] .staff.bounding-box rect { fill:red;stroke:orange;stroke-width:50;fill-opacity:0.4;stroke-opacity:0.8; }`

export const getVerovioSvgExtraAttributes = () =>  [ "measure@n" ]
