import { useState } from "react";
import { EditorialItem } from "./Editorial";

const OUTLINE_VERTICAL_GAP = 12


function SvgOverlay( {width, height, editorialOverlays } : {
    width: number,
    height: number,
    editorialOverlays: EditorialItem[]
 } ) {

    const [showingEditorial, setShowingEditorial] = useState<string|null>(null)

    const onEditorialClick = (id: string) => {
        console.log("clieked on id:  " + id)
        setShowingEditorial(id)
    }

    const onSvgClick = () => {
        if (showingEditorial) {
            setShowingEditorial(null)
        }
    }

    const onModalClick = () => {
        if (showingEditorial) {
            setShowingEditorial(null)
        }
    }


    console.log(editorialOverlays)
    const showingEditorialItem = showingEditorial ? editorialOverlays.find(e=> e.id == showingEditorial) : null

    return (
        <div>
            <svg
                className="w-10 h-10 text-gray-800 dark:text-white"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="red"
                style={{zIndex: 10, position: "absolute" }}
                width={width}
                height={height}
                onClick={onSvgClick}
                viewBox={`0 0 ${width} ${height}`}>

                {editorialOverlays.map((b) => 
                    <g key={b.id}  >
                        <rect className="overlay-editorial"
                            x={b.boundingBox!!.x}
                            y={b.boundingBox!!.y - OUTLINE_VERTICAL_GAP}
                            width={b.boundingBox!!.width}
                            height={b.boundingBox!!.height + OUTLINE_VERTICAL_GAP}
                            onClick={()=>onEditorialClick(b.id)}   
                            strokeWidth="5px"
                            stroke="red">               
                        </rect>
                        <text className="overlay-editorial-tooltip" fill="blue"
                        fontSize="1.2em" x={b.boundingBox!!.x + b.boundingBox!!.width / 2} y={b.boundingBox!!.y - 2* OUTLINE_VERTICAL_GAP}
                        dominantBaseline="middle" text-anchor="middle">{b.type}</text>
                    </g>
                    )}
        
            </svg>
            {showingEditorialItem != null ? 
                <div onClick={onModalClick} className="overlay-modal" style={{zIndex: 10, position: "absolute", left: "12%", top: "25%", width:"100%", height: "100%" }}>
                    <div className="overlay-box" style={{width: "75%", height: "50%" }} >
                        <h1>{`Nota ${showingEditorialItem.type}`}</h1>
                        <h2>{`id: ${showingEditorialItem.targetIds}`}</h2>
                        <h3>{`Razon: ${showingEditorialItem.reason}`}</h3>
                        <h4>{`responsable: ${showingEditorialItem.resp}`}</h4>
                    </div>
                </div> : null }

      </div>
    ) 
  }


  export default SvgOverlay;