import { TonoDef, repoRoot } from "./utils"
import { useState, useRef } from 'react'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus } from '@fortawesome/free-solid-svg-icons'
import SimpleIconButton from "./SimpleIconButton";
import { Pagination, Space } from "antd";

const zeroPad = (num: number, places: number) => String(num).padStart(places, '0');

library.add(faMagnifyingGlassMinus, faMagnifyingGlassPlus)


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

            <Space>
                <SimpleIconButton icon={faMagnifyingGlassMinus}
                    onClick={zoomOut}/>
                <SimpleIconButton icon={faMagnifyingGlassPlus}
                    onClick={zoomIn}/>
            </Space>


            <div className="imgContainer" ref={divRef} style={{ overflow: "scroll", height: "60vh" }}>
                <img id="facsimil-img" src={imgsUrls[pageIdx]} style={{ width: "auto", height: `${100 * zoom}%`, objectFit:"contain" }}/>
            </div>

            <h4 id="facsimil-title">{imgsLabels[pageIdx]}</h4>

            { imgsUrls.length > 1 ? <Pagination align="start" current={pageIdx + 1}
                                            defaultPageSize={1} total={imgsUrls.length} simple={false}
                                            onChange={(page: number, _: number)  => setCurrentPageNumber(page) }  /> : null }


        </div>
    )
}
export default ImagesView