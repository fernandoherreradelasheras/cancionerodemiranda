import { Button, Modal, Radio } from "antd";
import useStore, { Choice, EditorialItem, Option } from "./store";
import { useEffect } from "react";


function Editorials() {

    const editorialItems = useStore.use.editorialItems()

    const showingEditorial = useStore.use.showingEditorial()
    const setShowingEditorial = useStore.use.setShowingEditorial()

    const appOptions = useStore.use.appOptions()
    const setAppOptions = useStore.use.setAppOptions()

    const choiceOptions = useStore.use.choiceOptions()
    const setChoiceOptions = useStore.use.setChoiceOptions()

    const scoreSvg = useStore.use.scoreSvg()


    const showingEditorialItem = showingEditorial ? editorialItems.find(e => e.id == showingEditorial) : null

    const onEditorialClick = (id: string, _: any) => {
        setShowingEditorial(id)
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

        return annot != null ? <p>{annot.text}</p> : null
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
                return `opción ${1 + index}`
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

    const getOptionsList = (item: EditorialItem, selectedOptionIndex: number) => {
        const type = item.type
        const choice = item.choice!
        const options = choice.options.map((o, index) => { return { option: o, index: index } })

        return (
            <Radio.Group
                style={{ display: 'flex', flexDirection: 'column', gap: 8, }}
                onChange={(e) => onOptionSelected(type, choice, e.target.value)}
                value={selectedOptionIndex}
                options={options.map((o) => { return { value: o.index, label: getChoiceText(type, o.option.type, choice.options, o.index) } })} />
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


    const getElementSelectorsFromEditorialItems = (editorialItems: EditorialItem[]) => {
        const selectors = new Set<{ selector: string, id: string }>()
        editorialItems.forEach((item) => {
            selectors.add({ selector: `g#${item.id}:not(.bounding-box)`, id: item.id })
            item.correspIds?.forEach((correspId) => {
                selectors.add({ selector: `g[data-corresp="#${correspId}"]:not(.bounding-box)`, id: item.id })
            })
        })
        return selectors
    }

    const getBBRectSelectorsFromEditorialItems = (editorialItems: EditorialItem[]) => {
        const selectors = new Set<{ selector: string, id: string }>()
        editorialItems.forEach((item) => {
            selectors.add({ selector: `g#${item.id} .bounding-box rect`, id: item.id })
            item.correspIds?.forEach((correspId) => {
                selectors.add({ selector: `g[data-corresp="#${correspId}"].bounding-box rect`, id: item.id })
            })
        })
        return selectors
    }



    const getChoices = (item: EditorialItem) => {
        const type = item.type
        const choice = item.choice
        if (choice === undefined) {
            return null
        }

        const selectedOptionIdx = getSelectedOption(type, choice)
        const subtype = item.choice!.options[selectedOptionIdx].type

        const options = getOptionsList(item, selectedOptionIdx)

        return (
            <div>
                <br />
                <p>Actualmente se muestra la {getChoiceText(type, subtype, choice.options, selectedOptionIdx)} </p>
                <p>Opciones disponibles:</p>
                {options}
            </div>
        )
    }

    const elementSelectors = getElementSelectorsFromEditorialItems(editorialItems)
    const bbSelectors = getBBRectSelectorsFromEditorialItems(editorialItems)

    const highlightStyles = [...elementSelectors].map(e => `${e.selector} { outline: 40px dashed blue; cursor: pointer; pointer-events: auto;  }\n`).join("") +
        [...bbSelectors].map(b => `${b.selector} { fill: red; opacity: 0.3; }\n`).join("")

    useEffect(() => {


        const listeners: { element: Element, type: string, handler: (e: Event) => void }[] = []

        const selectors = getElementSelectorsFromEditorialItems(editorialItems)
        selectors.forEach((selector) => {

            const clickHandler = (e: Event) => onEditorialClick(selector.id, e)

            const elements = document.querySelectorAll(selector.selector)
            elements.forEach((element) => {
                element.addEventListener('click', clickHandler)
                listeners.push({ element: element, type: "click", handler: clickHandler })
            })
        })


        return () => {
            listeners.forEach((l) => {
                // At this point the old svg is still around so we should have access to the slements
                // just in case, protecting against exceptions
                try {
                    l.element.removeEventListener(l.type, l.handler)
                } catch (e) {
                    console.error("Failed to remove event listener", e)
                }
            })

        }
    }, [scoreSvg])

    return (
        <div>

            <style dangerouslySetInnerHTML={{ __html: highlightStyles }} />

            {showingEditorialItem ?
                <Modal
                    title={formatType(showingEditorialItem!.type)}
                    open={showingEditorialItem != null && showingEditorialItem != undefined}
                    footer={
                        <Button type="primary" onClick={() => setShowingEditorial(null)}>Ok</Button>
                    }>

                    {showingEditorialItem!.reason != "" ? <p>{`Razon: ${showingEditorialItem!.reason}`}</p> : ""}
                    {showingEditorialItem!.resp != "" ? <p>{`Responsable: ${showingEditorialItem!.resp}`}</p> : ""}
                    {getAnnotationText(showingEditorialItem!)}
                    {getChoices(showingEditorialItem!)}
                </Modal> : null}

        </div>
    )
}


export default Editorials;