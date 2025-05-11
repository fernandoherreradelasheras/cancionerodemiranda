import { ElementType, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getTonoUrl, MusicStatus, TextStatus, TonoDef } from './utils'
import IntroView from './IntroView'
import ImagesView from './ImagesView'
import Pdf from './Pdf'
import { Context } from './Context'
import { ScoreProperties, ScoreViewer } from 'score-viewer'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Col, Progress, ProgressProps, Row, Space, Tabs, TabsProps, Typography } from 'antd'
import TextView from './TextView'


const MINIMUM_SCORE_HEIGHT = 300
const STICKY_HEADER_HEIGHT = 48

const USE_VIRTUAL_UNITS = true


library.add(faMusic, faFilePdf, faFileImage )

type Section = {
    label: string,
    id: string
}



const getProgressFromTextStatus = (status: TextStatus) => {
    switch(status) {
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return  { value: 25, text: "transcripción en progreso" }
        case "transcription completed": return  { value: 50, text: "transcripción completa" }
        case "reviewed": return  { value: 75, text: "revisado" }
    }
    return  { value: 100, text: "completado" }

}

const getProgressFromMusicStatus = (status: MusicStatus) => {
    switch(status) {
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



const getDefaultSection = (tono: TonoDef) => {
    if (tono.introduction != undefined)
        return "intro"
    else if (tono.mei_file != undefined)
        return "music"
    else
        return "images"
}



const TonoView = ({ tono }: { tono: TonoDef }) => {

    const { scoreViewerConfig, definitions } = useContext(Context)

    const [activeTab, setActiveTab] = useState("music")
    const [scoreSize, setScoreSize] = useState<{width: string, height: string, scrollTo: number | null} | null>(null)
    const [scoreProperties, setScoreProperties] = useState<ScoreProperties | null>(null)
    const [scoreSectionId, setScoreSectionId] = useState<string | null>(null)
    const scoreViewerContainerRef = useRef<HTMLDivElement>(null)

    const tonoIndex = tono ? definitions.findIndex((t: TonoDef) => t.number == tono.number) : -1

    const { "value": textStatusValue , "text": textStatusText } = getProgressFromTextStatus(tono.status_text)
    const { "value": musicStatusValue , "text": musicStatusText } = getProgressFromMusicStatus(tono.status_music)

    const mei_url = useMemo(() => getTonoUrl(tono.path, tono.mei_file), [tono])

    const onClickSection = (section: Section) => {
        setScoreSectionId(section.id)
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


    useEffect(() => {
        if (activeTab == "music" && !tono.mei_file ||
            activeTab == "intro" && !tono.introduction ||
            activeTab == "text" && tono.text_transcription.length == 0) {
                setActiveTab(getDefaultSection(tono))
        }

    }, [tono, mei_url]);

    useEffect(() => {
        if (activeTab == "music" && scoreViewerContainerRef.current && !scoreSize) {
            const viewPortHeight = window.innerHeight
            const rect = scoreViewerContainerRef.current.getBoundingClientRect()
            const availableHeight = Math.floor(viewPortHeight - rect.top) - 6
            console.log(`availableHeight: ${availableHeight} rect.top: ${rect.top} viewPortHeight: ${viewPortHeight}`)
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
    }, [activeTab])



    const tabs: TabsProps['items'] = [
        tono.introduction ? {
            key: 'intro',
            label: 'Introducción',
            children: <IntroView tono={tono} />
        } : null,
        {
            key: 'text',
            label: 'Texto',
            children: <TextView tono={tono} />
        },
        tono.mei_file ? {
            key: 'music',
            label: 'Música',
            icon: <FontAwesomeIcon icon={faMusic} />,
            children: <div  ref={scoreViewerContainerRef}
                            className="score-viewer-container"
                            style={{ display: "flex", flexDirection: "column",
                                     height: "100%", width: "100%" }}>
                                { scoreSize ?

                             <ScoreViewer
                                    className="score-viewer"
                                    width={scoreSize.width}
                                    height={scoreSize.height}
                                    config={scoreViewerConfig}
                                    scoreIndex={tonoIndex}
                                    scoreSectionId={scoreSectionId}
                                    onScoreAnalyzed={onScoreAnalyzed}/>
                                    : null }
                </div>

        } : null,
        {
            key: 'images',
            label: 'Manuscrito',
            icon: <FontAwesomeIcon icon={faFileImage} />,
            children: <ImagesView tono={tono} />
        },
        {
            key: 'pdf',
            label: 'PDF',
            icon: <FontAwesomeIcon icon={faFilePdf} />,
            children: <Pdf tono={tono} />
        }
    ].filter(t => t != null)

   const defaultTab = getDefaultSection(tono)

   const editor = scoreProperties?.editor
   const reconstruction = scoreProperties?.reconstructionBy
   const numMeasures = scoreProperties?.numMeasures


   const sectionItems = useMemo(() => {
        return scoreProperties?.sections?.map((section: Section, index: number) =>
             <a onClick={() => { onClickSection(section) }}>{`${index + 1}. ${section.label}`}</a>
        )
    }, [scoreProperties])

    return (
        <div>

        <Row  style={{ justifyContent: "space-between", backgroundColor: "white", padding: "0.2em" }}>
            <Col xl={{flex: 1 }}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    <Typography.Text>Música: {tono.music_author}</Typography.Text><br/>
                    <Typography.Text>Texto: {tono.text_author}</Typography.Text><br/>
                    <Typography.Text>Orgánico: {tono.organic}</Typography.Text>

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
                            { reconstruction ?
                                <> <Typography.Text>Reconstrucción: {reconstruction}</Typography.Text><br/> </>: null }
                            <> <Typography.Text>Num compases: {numMeasures}</Typography.Text> </>
                        </div> : null }
                </Col>
                <Col xl={{flex: 1 }}
                 lg={{ flex: 1 }}
                 md={{ flex: 1 }}
                 sm={{ flex: 1 }}
                 xs={{ flex: '50%' }}>
                    { sectionItems &&  (sectionItems as Array<ElementType>).length > 1
                     ? <Space direction="vertical">
                            <Typography.Text>Secciones:</Typography.Text>
                            {sectionItems}
                        </Space> : null }
                </Col>
            </Row>
            <Tabs items={tabs} defaultActiveKey={defaultTab} activeKey={activeTab} onChange={(t) => setActiveTab(t)}/>
        </div>
    )
}

export default TonoView

