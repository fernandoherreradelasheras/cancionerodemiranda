import { useState, useRef } from 'react'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus } from '@fortawesome/free-solid-svg-icons'
import SimpleIconButton from "./SimpleIconButton";
import { Pagination, Space } from "antd";


library.add(faMagnifyingGlassMinus, faMagnifyingGlassPlus)

export type FacsimileItem = {
    name: string
    file: string
}

function ImagesView({ path, imageItems }: { path: string, imageItems: FacsimileItem[] }) {


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
                <img id="facsimil-img" src={path + imageItems[pageIdx].file} style={{ width: "auto", height: `${100 * zoom}%`, objectFit:"contain" }}/>
            </div>

            <h4 id="facsimil-title">{imageItems[pageIdx].name}</h4>

            { imageItems.length > 1 ? <Pagination align="start" current={pageIdx + 1}
                                            defaultPageSize={1} total={imageItems.length} simple={false}
                                            onChange={(page: number, _: number)  => setCurrentPageNumber(page) }  /> : null }


        </div>
    )
}
export default ImagesView