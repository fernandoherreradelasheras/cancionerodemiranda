import { useContext, useEffect, useState } from 'react'
import { getTonoUrl, MusicStatus, TextStatus, TonoDef } from './utils'
import IntroView from './IntroView'
import ImagesView from './ImagesView'
import Pdf from './Pdf'
import { Context } from './Context'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Flex, Progress, ProgressProps, Space, Spin, Tabs, TabsProps, Typography } from 'antd'
import TextView from './TextView'
import Verovio from './Verovio'

import useStore from "./store";
import ScoreAnalyzer from './ScoreAnalyzer'
import ScoreProcessor from './ScoreProcessor'



library.add(faMusic, faFilePdf, faFileImage )


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

    const score = useStore.use.score()
    const setScore = useStore.use.setScore()

    const scoreProperties = useStore.use.scoreProperties()
    const setScoreProperties = useStore.use.setScoreProperties()

    const isLoading = useStore.use.isLoading()

    const setScoreAudioFile = useStore.use.setScoreAudioFile()

    const setSection = useStore.use.setSection()

    const [activeTab, setActiveTab] = useState("music")

    const { scoreCache, setScoreCache } = useContext(Context)


    const { "value": textStatusValue , "text": textStatusText } = getProgressFromTextStatus(tono.status_text)
    const { "value": musicStatusValue , "text": musicStatusText } = getProgressFromMusicStatus(tono.status_music)

    const mei_url = getTonoUrl(tono.path, tono.mei_file)

    const onClickSection = (id: string) => {
        if (activeTab != "music") {
            setActiveTab("music")
        }
        setSection(id)
    }


    // Load MEI score data
    useEffect(() => {

        if (activeTab == "music" && !tono.mei_file ||
            activeTab == "intro" && !tono.introduction ||
            activeTab == "text" && tono.text_transcription.length == 0) {
                setActiveTab(getDefaultSection(tono))
        }

        // Reset state when tono changes
        setScore(null);

        if (!tono.mei_file) return;



        if (scoreCache != undefined && scoreCache[mei_url] != undefined) {
            setScore(scoreCache[mei_url]);
        } else {
            fetch(mei_url).then(response => {
                return response.text()
            }).then((scoreData) => {
                const scoreProcessor = new ScoreProcessor(scoreData)
                scoreProcessor.addTitlesFilter()
                scoreProcessor.addEnsureMeasuresIdFilter()
                scoreProcessor.addEnsureSectionsIdFilter()
                const score = scoreProcessor.filterScore()

                setScoreCache(
                    { ...scoreCache, [mei_url]: score }
                );
                const analyzer = new ScoreAnalyzer(score)
                const scoreProperties = analyzer.getScoreProperties()

                setScore(score);
                setScoreProperties(scoreProperties)
                setScoreAudioFile(tono.mp3_file)
            }).catch(error => {
                console.error("Failed to load MEI score:", error);
            });
        }
    }, [tono, mei_url]);

    // Music tab content with score loaded indicator
    const musicTabContent = (
        <div style={{
            height: 'calc(100vh - 250px)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>

            <Verovio className="score-viewer" />

            {score == null || isLoading ? (
                <div className="loading-spinner-parent">
                    <Spin size="large" />
                </div>
            ) : null }
        </div>
    );

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
            children: musicTabContent
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

    return (
        <div key={tono.number}>
            <Flex gap="small">
                <div>
                    <Typography.Text>Música: {tono.music_author}</Typography.Text><br/>
                    <Typography.Text>Texto: {tono.text_author}</Typography.Text><br/>
                    <Typography.Text>Orgánico: {tono.organic}</Typography.Text>

                </div>
                <div>
                    <div>Música: {musicStatusText}</div>
                    <Progress percent={musicStatusValue} steps={9} showInfo={false} strokeColor={progressColors}  />
                    <div>Texto: {textStatusText}</div>
                    <Progress percent={textStatusValue} steps={9} showInfo={false} strokeColor={progressColors}  />
                </div>
                <div>
                { scoreProperties ? <div>
                        <Typography.Text>Transcripción: {scoreProperties.editor}</Typography.Text><br/>
                        <Typography.Text>Num compases: {scoreProperties.numMeasures}</Typography.Text>
                        <ul>
                            {scoreProperties.notes?.map((n, index) =>  <li key={index}>{n}</li>)}
                        </ul>
                    </div> : null }

                </div>

                <div>
                    <Space direction="vertical">
                        <Typography.Text>Secciones:</Typography.Text>
                        {scoreProperties?.sections?.map((section, index) =>
                            <a key={index} onClick={()=> { onClickSection(section.id)}}> {`${index + 1}. ${section.label}`}</a>)}
                    </Space>

                </div>
            </Flex>
            <Tabs items={tabs} defaultActiveKey={defaultTab} activeKey={activeTab} onChange={(t) => setActiveTab(t)}/>
        </div>
    )
}

export default TonoView

