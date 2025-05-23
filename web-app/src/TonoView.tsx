import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { MusicStatus, TextStatus } from './utils'
import { Context } from './Context'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons'
import { Col, Progress, ProgressProps, Row, Space, Typography } from 'antd'
import { ScoreViewerConfigScore, ScoreProperties, VisualizationOptions, Reconstruction, ScoreViewer, ScoreViewerRef } from 'score-viewer'


const MINIMUM_SCORE_HEIGHT = 300
const STICKY_HEADER_HEIGHT = 48

const USE_VIRTUAL_UNITS = true


library.add(faMusic, faFilePdf, faFileImage )

type Section = {
    label: string,
    id: string
}

const getProgressFromTextStatus = (status?: TextStatus) => {
    switch(status) {
        case undefined: return { value: 5, text: "sin comenzar" }
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return  { value: 25, text: "transcripción en progreso" }
        case "transcription completed": return  { value: 50, text: "transcripción completa" }
        case "reviewed": return  { value: 75, text: "revisado" }
    }
    return  { value: 100, text: "completado" }

}

const getProgressFromMusicStatus = (status?: MusicStatus) => {
    switch(status) {
        case undefined: return { value: 5, text: "sin comenzar" }
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return  { value: 20, text: "transcripción en progreso" }
        case "transcription completed": return  { value: 40, text: "transcripción completa" }
        case "all voices completed": return { value: 60, text: "todas las voces completas"}
        case "reviewed": return  { value: 80, text: "revisado" }
    }
    return  { value: 100, text: "completado" }
}

const progressColors: ProgressProps['strokeColor'] = [
    '#FF4B4B',
    '#FF8C42',
    '#FF8C42',
    '#FFC13D',
    '#FFC13D',
    '#9ED36A',
    '#4CAF50',
    '#4CAF50',
    '#2E7D32'
]



const TonoView = ({ tonoConfig }: { tonoConfig: ScoreViewerConfigScore }) => {

    const { scoreViewerConfig, status: definitions, currentTonoNumber } = useContext(Context)

    const [scoreSize, setScoreSize] = useState<{width: string, height: string, scrollTo: number | null} | null>(null)
    const [scoreProperties, setScoreProperties] = useState<ScoreProperties | null>(null)
    const [visualizationOptions, setVisualizationOptions] = useState<VisualizationOptions | null>(null)
    const scoreViewerContainerRef = useRef<HTMLDivElement>(null)

    const tonoIndex = useMemo(() => (currentTonoNumber || 0) - 1, [currentTonoNumber])
    const tonoStatus = useMemo(() => definitions ? definitions[tonoIndex] : null, [definitions, tonoIndex])

    const { "value": textStatusValue , "text": textStatusText } = getProgressFromTextStatus(tonoStatus?.status_text)
    const { "value": musicStatusValue , "text": musicStatusText } = getProgressFromMusicStatus(tonoStatus?.status_music)

    const scoreViewerRef = useRef<ScoreViewerRef>(null);


    const onClickSection = (section: Section) => {
        scoreViewerRef.current?.goToSection(section.id)
    }

    const onScoreAnalyzed = (_: number, scoreProperties: ScoreProperties) => {
        setScoreProperties(scoreProperties)
        if (scoreSize?.scrollTo) {
            const currentY = window.pageYOffset || document.body.scrollTop || document.documentElement.scrollTop || 0;
            const maxY = Math.max(
                document.body.scrollHeight || 0,
                document.documentElement.scrollHeight || 0,
                document.body.offsetHeight || 0,
                document.documentElement.offsetHeight || 0,
                document.body.clientHeight || 0,
                document.documentElement.clientHeight || 0)
            console.log(`scrolling to ${scoreSize.scrollTo}. win currentY: ${currentY} maxY: ${maxY}`)
            window.scroll(0, scoreSize.scrollTo)
        }
    }


    const onVisualizationOptionsChanged = (_: number, changedOptions: VisualizationOptions) => {
        setVisualizationOptions(
            (visualizationOptions : VisualizationOptions | null) => ({ ...visualizationOptions, ...changedOptions })
        )
    }


    const reconstructionsFromOptions = useMemo(() => {
        if (!visualizationOptions?.showReconstructions ||
            Object.values(visualizationOptions.showReconstructions).length <= 0) {
            return null
        }

        const activeReconstruction = Object.entries(visualizationOptions.showReconstructions)
            .filter(([_, label]) => label != null && label != "none")

        const reconstructionTexts = activeReconstruction.map(([staff, label]) => {
            const voiceName = scoreProperties?.reconstructions.find((r: Reconstruction) => r.staff == staff)?.voiceName
            const model = (label as string).split(":")[3]
            return `${voiceName ? voiceName : staff}: ${model}`
        })
        return reconstructionTexts.join(", ")
    }, [visualizationOptions])



    useEffect(() => {
        setVisualizationOptions(null)
    }, [tonoConfig]);


    useEffect(() => {
        if (scoreViewerContainerRef.current && !scoreSize) {
            const viewPortHeight = window.innerHeight
            const rect = scoreViewerContainerRef.current.getBoundingClientRect()
            const availableHeight = Math.floor(viewPortHeight - rect.top) - 6
            if (availableHeight >= MINIMUM_SCORE_HEIGHT) {
                setScoreSize({
                    width:  USE_VIRTUAL_UNITS ? "100%" : `${Math.floor(rect.width)}px`,
                    height: USE_VIRTUAL_UNITS ? `${Math.round(availableHeight / viewPortHeight * 100) - 4}vh` : `${availableHeight}px`,
                    scrollTo: null
                })
            } else {
                const height = viewPortHeight - STICKY_HEADER_HEIGHT - 6
                setScoreSize({
                    width:  USE_VIRTUAL_UNITS ? "100%" : `${Math.floor(rect.width)}px`,
                    height: USE_VIRTUAL_UNITS ? `${height / viewPortHeight * 100}vh` : `${viewPortHeight - STICKY_HEADER_HEIGHT - 6}px`,
                    scrollTo: rect.top + 6,
                })
            }
        }
    }, [])



   const editor = scoreProperties?.editor
   const reconstruction = scoreProperties?.reconstructionBy
   const numMeasures = scoreProperties?.numMeasures

   const sectionItems = useMemo(() => {
        return scoreProperties?.sections?.map((section: Section, index: number) =>
             <a onClick={() => { onClickSection(section) }}>{`${index + 1}. ${section.label}`}</a>) || null
    }, [scoreProperties])


    return (
        <div>

        <Row  style={{ justifyContent: "space-between", backgroundColor: "white", padding: "0.2em" }}>
            <Col xl={{flex: 1 }}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    <Typography.Text>Música: {tonoStatus?.music_author}</Typography.Text><br/>
                    <Typography.Text>Texto: {tonoStatus?.text_author}</Typography.Text><br/>
                    <Typography.Text>Orgánico: {tonoStatus?.organic}</Typography.Text>

                </Col>
                <Col xl={{flex: 1}}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    <div>Música: {musicStatusText}</div>
                    <Progress percent={musicStatusValue} steps={9} showInfo={false} strokeColor={progressColors}  />
                    <div>Texto: {textStatusText}</div>
                    <Progress percent={textStatusValue} steps={9} showInfo={false} strokeColor={progressColors}  />
                </Col>
                <Col xl={{flex: 1}}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    { scoreProperties? <div>
                            <> <Typography.Text>Transcripción: {editor}</Typography.Text><br/> </>
                            { reconstruction || reconstructionsFromOptions ?
                                <> <Typography.Text>Reconstrucción: {reconstruction || reconstructionsFromOptions}</Typography.Text><br/> </>: null }
                            <> <Typography.Text>Num compases: {numMeasures}</Typography.Text> </>
                        </div> : null }
                </Col>
                <Col xl={{flex: 1 }}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    { sectionItems && sectionItems.length > 1 ? <Space direction="vertical">
                            <Typography.Text>Secciones:</Typography.Text>
                            {sectionItems}
                        </Space> : null }
                </Col>
            </Row>
            <div ref={scoreViewerContainerRef}
                className="score-viewer-container"
                style={{
                    display: "flex", flexDirection: "column",
                    height: "100%", width: "100%"
                }}>

                {scoreSize && scoreViewerConfig ? <ScoreViewer
                    width={scoreSize.width}
                    height={scoreSize.height}
                    config={scoreViewerConfig}
                    ref={scoreViewerRef}
                    scoreIndex={tonoIndex}
                    onVisualizationOptionsChanged={onVisualizationOptionsChanged}
                    onScoreAnalyzed={onScoreAnalyzed}
                /> : null}

            </div>
        </div>
    )
}

export default TonoView

