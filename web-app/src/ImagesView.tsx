import Pagination from "./Pagination";
import { TonoDef, repoRoot } from "./utils"
import { useState, useRef } from 'react'


const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');



function ImagesView({ tono }: { tono: TonoDef }) {

    const imgsUrls = [
        ...tono['s1_pages'].map(p => `${repoRoot}facsimil-images/S1/image-${zeroPad(p - 1, 3)}.jpg`),
        ...tono['s2_pages'].map(p => `${repoRoot}facsimil-images/S2/image-${zeroPad(p - 1, 3)}.jpg`),
        ...tono['t_pages'].map(p => `${repoRoot}facsimil-images/T/image-${zeroPad(p - 1, 3)}.jpg`),
        ...tono['g_pages'].map(p => `${repoRoot}facsimil-images/G/image-${zeroPad(p - 1, 3)}.jpg`)];
    const imgsLabels = [
        ...tono['s1_pages'].map(p => `Tiple 1º p. ${p}`),
        ...tono['s2_pages'].map(p => `Tiple 2º p. ${p}`),
        ...tono['t_pages'].map(p => `Tenor p. ${p}`),
        ...tono['g_pages'].map(p => `Guion p. ${p}`)];


    const [pageIdx, setPageIdx] = useState(0)
    const [zoom, setZoom] = useState(1.0)

    const divRef = useRef(null);
    
    const zoomIn = () => {
        if (zoom < 8) {
            setZoom(zoom + 0.2)
        }
    }

    const zoomOut = () => {
        if (zoom > 1.0) {
            setZoom(zoom - 0.2)
        }
    }

    const setCurrentPageNumber = (pageNumber: number) => {
        setPageIdx(pageNumber - 1)
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>

            <ul className="actions small">
                <li><a className="button icon primary fa-solid fa-magnifying-glass-minus small" onClick={zoomOut}></a></li>
                <li><a className="button icon primary fa-solid fa-magnifying-glass-plus small" onClick={zoomIn}></a></li>
            </ul>

            <div className="imgContainer" ref={divRef} style={{ overflow: "scroll", height: "60vh" }}>
                <img id="facsimil-img" src={imgsUrls[pageIdx]} style={{ width: "auto", height: `${100 * zoom}%`, objectFit:"contain" }}/>
            </div>

            <h4 id="facsimil-title">{imgsLabels[pageIdx]}</h4>

            <Pagination className="images-pagination" currentPageNumber={pageIdx + 1}
                    totalPages={ imgsUrls.length}
                    onPage={(pageNumber: number) => setCurrentPageNumber(pageNumber)} />
            
        </div>
    )
}
export default ImagesView