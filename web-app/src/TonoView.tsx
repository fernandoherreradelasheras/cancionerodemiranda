import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { MusicStatus, TextStatus } from './utils'
import { Context } from './Context'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faMusic, faFilePdf, faFileImage } from '@fortawesome/free-solid-svg-icons'
import { Col, Collapse, Grid, Progress, ProgressProps, Row, Space, Typography } from 'antd'
import { ScoreProperties, ScoreViewer, ScoreViewerRef } from 'score-viewer'
import { isMobile, useMobileOrientation } from 'react-device-detect'


/* Viewer floor: if the header grows so much that this room is not left (very short
   screens), the page grows and scrolls instead of squashing the score. */
const MINIMUM_SCORE_HEIGHT = 300

const { useBreakpoint } = Grid

library.add(faMusic, faFilePdf, faFileImage)

type Section = {
    label: string,
    id: string
}

const getProgressFromTextStatus = (status?: TextStatus) => {
    switch (status) {
        case undefined: return { value: 5, text: "sin comenzar" }
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return { value: 25, text: "transcripción en progreso" }
        case "transcription completed": return { value: 70, text: "transcripción completa" }
        case "reviewed": return { value: 80, text: "revisado" }
    }
    return { value: 100, text: "completado" }

}

const getProgressFromMusicStatus = (status?: MusicStatus) => {
    switch (status) {
        case undefined: return { value: 5, text: "sin comenzar" }
        case "not started": return { value: 5, text: "sin comenzar" }
        case "raw transcription": return { value: 20, text: "transcripción en progreso" }
        case "transcription completed": return { value: 40, text: "transcripción completa" }
        case "reconstruction started": return { value: 60, text: "reconstrucción en progreso" }
        case "music completed": return { value: 70, text: "música completa" }
        case "reviewed": return { value: 80, text: "revisado" }
    }
    return { value: 100, text: "completado" }
}

const get_edition_name = (name: string) => {
    switch (name) {
        case "scholar":
            return "Edición para musicólogos (pdf)"
        case "performer":
            return "Edición para intérpretes (pdf)"
    }

    return name
}

const get_edition_shortname = (name: string) => {
    switch (name) {
        case "scholar":
            return "musicólogos"
        case "performer":
            return "intérpretes"
    }

    return name
}

const get_edition_filename = (name: string, tonoIndex: number, title: string) => {
    const baseName = `Cancionero de Miranda - Tono ${tonoIndex + 1} ${title}`
    const edition = get_edition_shortname(name)


    return `${baseName} (${edition}).pdf`
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



const TonoView = ({ tonoIndex }: { tonoIndex: number | null }) => {

    const { scoreViewerConfig, status: definitions } = useContext(Context)

    const [scoreProperties, setScoreProperties] = useState<ScoreProperties | null>(null)
    const scoreContainerRef = useRef<HTMLDivElement>(null)

    /* On mobile landscape the tono header and the score do not fit together: we give the
       viewer the full height of the content area and scroll the header out of sight, so that
       only the top bar remains. This is the same signal score-viewer uses internally to
       decide its own layout. */
    const { isLandscape } = useMobileOrientation()
    const fullHeightScore = isMobile && isLandscape

    /* The data row is meant for landscape: on narrow screens the five columns stack up and
       eat half the screen, so there it goes collapsed behind a one line summary. */
    const screens = useBreakpoint()
    const collapsibleHeader = !screens.md

    const scrollScoreIntoView = () => {
        if (fullHeightScore) {
            scoreContainerRef.current?.scrollIntoView({ block: "start" })
        }
    }

    const tonoStatus = useMemo(() => definitions && tonoIndex != null ? definitions[tonoIndex] : null, [definitions, tonoIndex])

    const { "value": textStatusValue, "text": textStatusText } = getProgressFromTextStatus(tonoStatus?.status_text)
    const { "value": musicStatusValue, "text": musicStatusText } = getProgressFromMusicStatus(tonoStatus?.status_music)

    const scoreViewerRef = useRef<ScoreViewerRef>(null);


    const onClickSection = (section: Section) => {
        scoreViewerRef.current?.goToSection(section.id)
    }

    const onScoreAnalyzed = (_: number, scoreProperties: ScoreProperties) => {
        setScoreProperties(scoreProperties)
        // The header just grew with the score data: reposition
        scrollScoreIntoView()
    }


    const editor = scoreProperties?.editor
    const reconstruction = scoreProperties?.reconstructionBy
    const numMeasures = scoreProperties?.numMeasures
    const title = tonoIndex ? `${scoreViewerConfig?.scores[tonoIndex].title}` : ""

    const sectionItems = useMemo(() => {
        return scoreProperties?.sections?.map((section: Section, index: number) =>
            <a onClick={() => { onClickSection(section) }}>{`${index + 1}. ${section.label}`}</a>) || null
    }, [scoreProperties])



    useEffect(() => {
        if (scoreViewerRef.current) {
            scoreViewerRef.current.selectScore(tonoIndex)
        }
    }, [tonoIndex, scoreViewerConfig]);

    // On mount, when changing tono and when rotating the device
    useEffect(scrollScoreIntoView, [fullHeightScore, tonoIndex])


    const tonoDataRow = (
            <Row style={{ flex: "none", justifyContent: "space-between", backgroundColor: "white", padding: "0.2em" }}>
                <Col xl={{ flex: 1 }}
                    lg={{ flex: 1 }}
                    md={{ flex: 1 }}
                    sm={{ flex: 1 }}
                    xs={{ flex: '50%' }}>
                    <Typography.Text>Música: {tonoStatus?.music_author}</Typography.Text><br />
                    <Typography.Text>Texto: {tonoStatus?.text_author}</Typography.Text><br />
                    <Typography.Text>Orgánico: {tonoStatus?.organic}</Typography.Text>

                </Col>
                <Col xl={{ flex: 1 }}
                    lg={{ flex: 1 }}
                    md={{ flex: 1 }}
                    sm={{ flex: 1 }}
                    xs={{ flex: '50%' }}>
                    <div>Música: {musicStatusText}</div>
                    <Progress percent={musicStatusValue} steps={9} showInfo={false} strokeColor={progressColors} />
                    <div>Texto: {textStatusText}</div>
                    <Progress percent={textStatusValue} steps={9} showInfo={false} strokeColor={progressColors} />
                </Col>
                <Col xl={{ flex: 1 }}
                    lg={{ flex: 1 }}
                    md={{ flex: 1 }}
                    sm={{ flex: 1 }}
                    xs={{ flex: '50%' }}>
                    {scoreProperties ? <div>
                        <> <Typography.Text>Transcripción: {editor}</Typography.Text><br /> </>
                        {reconstruction ?
                            <> <Typography.Text>Reconstrucción: {reconstruction}</Typography.Text><br /> </> : null}
                        <> <Typography.Text>Num compases: {numMeasures}</Typography.Text> </>
                    </div> : null}
                </Col>
                <Col xl={{ flex: 1 }}
                    lg={{ flex: 1 }}
                    md={{ flex: 1 }}
                    sm={{ flex: 1 }}
                    xs={{ flex: '50%' }}>
                    {sectionItems && sectionItems.length > 1 ? <Space direction="vertical">
                        <Typography.Text>Secciones:</Typography.Text>
                        {sectionItems}
                    </Space> : null}
                </Col>
                <Col xl={{ flex: 1 }}
                    lg={{ flex: 1 }}
                    md={{ flex: 1 }}
                    sm={{ flex: 1 }}
                    xs={{ flex: '50%' }}>
                    {tonoIndex != null && tonoStatus?.pdfs && tonoStatus.pdfs.length > 0 ? <Space direction="vertical">
                        <Typography.Text> Versiones para imprimir:</Typography.Text>
                        {tonoStatus.pdfs.map((pdf, index) =>
                            pdf.name ? <a key={index} download={get_edition_filename(pdf.name, tonoIndex, title)} href={pdf.url}>{get_edition_name(pdf.name)}</a> : null
                        )}
                    </Space> : null}
                </Col>
            </Row>
    )

    // Summary shown when the header is collapsed. Short: it has to fit one mobile line
    const tonoDataSummary = [
        "Datos del tono",
        numMeasures ? `${numMeasures} compases` : null
    ].filter(Boolean).join(" · ")

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>

            {collapsibleHeader ?
                <Collapse
                    ghost
                    size="small"
                    className="tono-data-collapse"
                    style={{ flex: "none", backgroundColor: "white" }}
                    items={[{
                        key: "tono-data",
                        label: <Typography.Text strong ellipsis>{tonoDataSummary}</Typography.Text>,
                        children: tonoDataRow
                    }]} />
                : tonoDataRow}

            <div ref={scoreContainerRef}
                className="score-viewer-container"
                style={{
                    flex: 1,
                    minHeight: fullHeightScore ? "100%" : MINIMUM_SCORE_HEIGHT,
                    width: "100%"
                }}>

                {scoreViewerConfig ?
                    <ScoreViewer
                        width="100%"
                        height="100%"
                        config={scoreViewerConfig}
                        ref={scoreViewerRef}
                        onScoreAnalyzed={onScoreAnalyzed} /> : null}
            </div>
        </div>
    )
}

export default TonoView

