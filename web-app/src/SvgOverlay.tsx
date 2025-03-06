import { useState } from "react";
import { Choice, EditorialItem, Option } from "./Editorial";

const getBorderColor = (type: string) => {
    if (type == "unclear") return "rgb(187, 172, 39)"
    else if (type == "corr")  return "rgb(36, 160, 73)"
    else if (type == "sic")  return "rgb(172, 32, 32)"
    else if (type == "choice")  return "rgb(121, 100, 240)"
    else return "rgb(170, 38, 38)"
}

function SvgOverlay( {width, height, style, editorialOverlays, onOptionSelected } : {
    width: number,
    height: number,
    style: any,
    editorialOverlays: EditorialItem[]
    onOptionSelected: (type: string, choice: Choice, index: number) => void
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

    const formatType = (type: string) => {
        if (type == "corr") {
            return "Corrección aplicada"
        } else if (type == "unclear") {
            return "Elemento poco claro en la fuente"
        } else if (type == "choice") {
            return "Opciones disponibles"
        } else if (type == "app") {
            return "Lecturas alternativas"
        } else if (type == "lem") {
            return "lectura preferida"
        } else if (type == "rdg") {
            return "otra lectura"
        } else if (type == "sic") {
            return "error evidente"
        } else if (type == "supplied") {
            return "parte añadida"
        } else if (type == "reg") {
            return "Regularización"
        } else {
            return `tipo: ${type}`
        }
    }


    const getAnnotationText = (item: EditorialItem) => {
        if (item.annotations.size <= 0) {
            return null
        }
        const annot = item.annotations.values().next().value

        return annot != null ? <p>{ annot.text }</p> : null
    }




    const getChoiceText = (type: string, subtype: string, options: Option[], index: number) => {
        if (type == "app") {
            if (subtype == "lem") {
                return "lectura preferida"
            }
            const rdgs = options.filter(o => o.type == "rdg")
            if (rdgs.length == 1) {
                return "lectura alternativa"
            }
            return `lectura alternativa nº${1 + rdgs.findIndex(r => r == options[index])}`
        } else if (type == "choice") {
            if (subtype == "reg") {
                return "lectura regularizada"
            } else if (subtype == "orig") {
                return "lectura original"
            } else {
                return `opción ${1+ index}`
            }
        } else {
            return ""
        }
    }

    const getNonSelectedOptionsList = (item: EditorialItem) => {
        const type = item.type
        const choice = item.choice!
        const options = choice.options
        const selectedIndex = choice?.selectedOptionIdx
        const nonSelectedOptions = options.map((o, index) => { return { option: o, index: index} } ).filter((_, index) => index != selectedIndex)

        return (
            <ul>
                 { nonSelectedOptions.map((n) =>
                    <li key={n.index}>
                        {getChoiceText(type, n.option.type, options, n.index)}
                        <a onClick={() => onOptionSelected(type, choice, n.index)} className="button small primary">Mostrar</a>
                    </li>
                 )}
            </ul>
        )
    }


    const getChoices = (item: EditorialItem) => {
        const type = item.type
        const choice = item.choice
        if (choice === undefined) {
            return null
        }
        const subtype = item.choice!.options[choice!.selectedOptionIdx].type

        const options = getNonSelectedOptionsList(item)

        return (
            <div>
                <br/>
                <p>Actualmente se muestra la {getChoiceText(type, subtype, choice.options, choice.selectedOptionIdx) } </p>
                <p>Opciones disponibles:</p>
                {options}
            </div>
        )
    }

    const showingEditorialItem = showingEditorial ? editorialOverlays.find(e => e.id == showingEditorial.id) : null

    return (
        <div className="verovio-overlay-container">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="red"
                width={width}
                height={height}
                style={style}
                onClick={onSvgClick}
                viewBox={`0 0 ${width} ${height}`}>
                <defs>
                    <filter x="-0.05" y="0.1" width="1.1" height="1" id="background-filter">
                        <feFlood floodColor="black" result="bg"></feFlood>
                        <feMerge>
                            <feMergeNode in="bg"></feMergeNode>
                            <feMergeNode in="SourceGraphic"></feMergeNode>
                        </feMerge>
                    </filter>
                </defs>

                {editorialOverlays.map((overlay, index) =>
                    <g key={index}  >
                        <rect className="overlay-editorial"
                            x={overlay.boundingBox!!.x}
                            y={overlay.boundingBox!!.y}
                            width={overlay.boundingBox!!.width}
                            height={overlay.boundingBox!!.height}
                            onClick={(e)=>onEditorialClick(overlay.id, e)}
                            strokeWidth="2"
                            fillOpacity="0.05"
                            stroke={getBorderColor(overlay.type)}/>

                        <text className="overlay-editorial-tooltip" fill="white"
                        filter="url(#background-filter)"
                        fontSize="1.2em"
                        x={overlay.boundingBox!!.x + overlay.boundingBox!!.width / 2}
                        y={overlay.boundingBox!!.y + overlay.boundingBox!!.height}
                        dominantBaseline="hanging"
                        textAnchor="middle">{overlay.type}</text>
                    </g>
                    )}

            </svg>
            {showingEditorialItem != null ?
                <div onClick={onModalClick} className="overly-modal" style={{
                    zIndex: 10,
                    position: "absolute",
                    left: "25%",
                    top: showingEditorial!!.posY < height / 2 ? showingEditorial!!.posY : showingEditorial!!.posY - height / 2,
                    width:"100%",
                    height: "100%" }}>
                    <div className="overlay-box" style={{width: "75%" }} >
                        <h1>{ formatType(showingEditorialItem.type) }</h1>
                        { getAnnotationText(showingEditorialItem) }
                        { showingEditorialItem.reason != "" ? <p>{`Razon: ${showingEditorialItem.reason}`}</p> : "" }
                        { showingEditorialItem.resp != "" ? <p>{`Responsable: ${showingEditorialItem.resp}`}</p> : "" }
                        { getChoices(showingEditorialItem) }
                    </div>
                </div> : null }

      </div>
    )
  }


  export default SvgOverlay;