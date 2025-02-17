import { useState } from "react";
import { EditorialItem } from "./Editorial";

const getBorderColor = (type: string) => {
    if (type == "unclear") return "rgb(187, 172, 39)"
    else if (type == "corr")  return "rgb(36, 160, 73)"
    else if (type == "sic")  return "rgb(172, 32, 32)"
    else if (type == "choice")  return "rgb(121, 100, 240)"
    else return "rgb(0, 0, 0)"
}

function SvgOverlay( {width, height, editorialOverlays } : {
    width: number,
    height: number,
    editorialOverlays: EditorialItem[]
 } ) {

    const [showingEditorial, setShowingEditorial] = useState<{id: string, posX: number, posY: number} | null>(null)

    const onEditorialClick = (id: string, e: any) => {
        setShowingEditorial({ id: id,
            posX:  e?.target?.x?.baseVal?.value + e?.target?.width?.baseVal?.value + 20, 
            posY: e?.target?.y?.baseVal?.value + e?.target?.height?.baseVal?.value + 20 })
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

    const formatTitle = (type: string) => {
        if (type == "corr") {
            return "Corrección aplicada"
        } else if (type == "unclear") {
            return "Elemento poco claro en la fuente"
        } else if (type == "choice") {
            return "Otra opción disponible"
        } else {
            return `tipo: ${type}`
        }
    }


    console.log(editorialOverlays)
    const showingEditorialItem = showingEditorial ? editorialOverlays.find(e => e.id == showingEditorial.id) : null

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

                {editorialOverlays.map((overlay) => 
                    <g key={overlay.id}  >
                        <rect className="overlay-editorial"
                            x={overlay.boundingBox!!.x}
                            y={overlay.boundingBox!!.y}
                            width={overlay.boundingBox!!.width}
                            height={overlay.boundingBox!!.height}
                            onClick={(e)=>onEditorialClick(overlay.id, e)}   
                            strokeWidth="2"
                            fillOpacity="0.05"
                            stroke={getBorderColor(overlay.type)}/>
                        
                        <text className="overlay-editorial-tooltip" fill="blue"
                        fontSize="1.2em"
                        x={overlay.boundingBox!!.x + overlay.boundingBox!!.width / 2}
                        y={overlay.boundingBox!!.y + overlay.boundingBox!!.height + 6}
                        dominantBaseline="middle"
                        textAnchor="middle">{overlay.type}</text>
                    </g>
                    )}
        
            </svg>
            {showingEditorialItem != null ? 
                <div onClick={onModalClick} className="overly-modal" style={{
                    zIndex: 10,
                    position: "absolute",
                    left: showingEditorial?.posX,
                    top: showingEditorial?.posY,
                    width:"100%",
                    height: "100%" }}>
                    <div className="overlay-box" style={{width: "75%" }} >
                        <h1>{ formatTitle(showingEditorialItem.type) }</h1>
                        <p>Id elemento afectado: <em>{showingEditorialItem.targetIds}</em></p>
                        <p>{ showingEditorialItem.textFromAnnotations }</p>
                        { showingEditorialItem.reason != "" ? <p>{`Razon: ${showingEditorialItem.reason}`}</p> : "" }
                        { showingEditorialItem.resp != "" ? <p>{`Responsable: ${showingEditorialItem.resp}`}</p> : "" }
                        { showingEditorialItem.type == "choice" ? <p>TODO: añadir botón para renderizar esa opción</p> : "" }
                    </div>
                </div> : null }

      </div>
    ) 
  }


  export default SvgOverlay;