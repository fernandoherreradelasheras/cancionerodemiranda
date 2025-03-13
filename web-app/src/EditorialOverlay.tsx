import { Button, Space } from "antd";
import useStore, { Choice, EditorialItem, Option } from "./store";
import { useMeasure } from "react-use";


const getBorderColor = (type: string) => {
    if (type == "unclear") return "rgb(187, 172, 39)"
    else if (type == "corr")  return "rgb(36, 160, 73)"
    else if (type == "sic")  return "rgb(172, 32, 32)"
    else if (type == "choice")  return "rgb(121, 100, 240)"
    else return "rgb(170, 38, 38)"
}

function EditorialOverlay( { style } : {
    style: any,
 } ) {


    const highlights = useStore.use.highlights()
    const editorialOverlays = useStore.use.editorialOverlays()

    const showingEditorial = useStore.use.showingEditorial()
    const setShowingEditorial = useStore.use.setShowingEditorial()

    const appOptions = useStore.use.appOptions()
    const setAppOptions = useStore.use.setAppOptions()

    const choiceOptions = useStore.use.choiceOptions()
    const setChoiceOptions = useStore.use.setChoiceOptions()

    const [ containerRef, { height: containerHeight } ] = useMeasure<HTMLDivElement>()


    const showingEditorialItem = showingEditorial ? editorialOverlays.find(e => e.id == showingEditorial.id) : null


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

    const onOptionSelected = (type: string, choice: Choice, selectedOptionIndex: number) => {
        const removeEntries = choice.options.filter((_, index) => index != selectedOptionIndex).map(o => o.selector)
        if (type == "app") {
            const newOptions = appOptions.filter((o: any) => !removeEntries.includes(o))
            newOptions.push(choice.options[selectedOptionIndex].selector)
            setAppOptions(newOptions, true)
        } else if (type == "choice") {
            const newOptions = choiceOptions.filter((o: any) => !removeEntries.includes(o))
            newOptions.push(choice.options[selectedOptionIndex].selector)
            setChoiceOptions(newOptions, true)
        }

    }

    const getNonSelectedOptionsList = (item: EditorialItem) => {
        const type = item.type
        const choice = item.choice!
        const options = choice.options
        const selectedIndex = getSelectedOption(type, choice)
        const nonSelectedOptions = options.map((o, index) => { return { option: o, index: index} } ).filter((_, index) => index != selectedIndex)

        return (
            <ul>
                 { nonSelectedOptions.map((n) =>
                    <li key={n.index}>
                        <Space>
                            {getChoiceText(type, n.option.type, options, n.index)}
                            <Button color="purple" variant="solid" onClick={() => onOptionSelected(type, choice, n.index)} size="middle">Mostrar</Button>
                        </Space>
                    </li>
                 )}
            </ul>
        )
    }

    const getSelectedOption = (type: string, choice: Choice) => {
        if (type == "app") {
            const inApp = choice.options.findIndex((option) => Object.values(appOptions).includes(option.selector))
            if (inApp != -1) {
                return inApp
            } else {
                // Default app order is: 1) lem, 2) if no lem, first rdg
                const lemIdx = choice.options.findIndex((option) => option.type == "lem")
                if (lemIdx != -1) {
                    return lemIdx
                }
                return 0
            }
        } else if (type == "choice") {
            const inChoices = choice.options.findIndex((option) => Object.values(choiceOptions).includes(option.selector))
            if (inChoices != -1) {
                return inChoices
            } else {
                return 0
            }
        }

        return 0
    }


    const getChoices = (item: EditorialItem) => {
        const type = item.type
        const choice = item.choice
        if (choice === undefined) {
            return null
        }

        const selectedOptionIdx = getSelectedOption(type, choice)
        const subtype = item.choice!.options[selectedOptionIdx].type

        const options = getNonSelectedOptionsList(item)

        return (
            <div>
                <br/>
                <p>Actualmente se muestra la {getChoiceText(type, subtype, choice.options, selectedOptionIdx) } </p>
                <p>Opciones disponibles:</p>
                {options}
            </div>
        )
    }

    const rects = Object.entries(highlights).map(([id, h]) => (

        <g key={id}  >
            <rect className="overlay-editorial"
                x={h.x}
                y={h.y}
                width={h.width}
                height={h.height}
                onClick={(e) => { onEditorialClick(h.editorialId, e) } }
                strokeWidth="2"
                fillOpacity="0.05"
                stroke={getBorderColor("app")} />


            <text className="overlay-editorial-tooltip" fill="white"
            filter="url(#background-filter)"
            fontSize="1.2em"
            x={h.x + h.width / 2}
            y={h.y + h.height}
            dominantBaseline="hanging"
            textAnchor="middle">{h.type}</text>
        </g>
    )
    )



    return (
        <div className="verovio-overlay-container" ref={containerRef}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="red"

                style={style}
                onClick={onSvgClick}>
                <defs>
                    <filter x="-0.05" y="0.1" width="1.1" height="1" id="background-filter">
                        <feFlood floodColor="black" result="bg"></feFlood>
                        <feMerge>
                            <feMergeNode in="bg"></feMergeNode>
                            <feMergeNode in="SourceGraphic"></feMergeNode>
                        </feMerge>
                    </filter>
                </defs>

                {rects}

            </svg>


            {showingEditorialItem != null && showingEditorial != null ?
                <div onClick={onModalClick} className="overlay-modal" style={{
                    zIndex: 10,
                    position: "absolute",
                    left: "25%",
                    width: "75%",
                    top: showingEditorial.posY < containerHeight / 2 ?
                        showingEditorial.posY : showingEditorial.posY - containerHeight / 2,
                     }}>
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


  export default EditorialOverlay;