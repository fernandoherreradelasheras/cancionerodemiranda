import { useState } from 'react';
import { Space, Pagination, Slider, SelectProps, Select, Switch, Drawer, Button, Col, Row, Typography } from 'antd';
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus, faExpand } from '@fortawesome/free-solid-svg-icons';
import SimpleIconButton from './SimpleIconButton';
import { Scale } from './uidefs';
import useStore from "./store";
import { DefaultOptionType } from 'antd/es/select';


interface ScoreControlProps {
    toggleFullScreen: () => void
    exitFullScreen:() => void
}

const ScoreControls = ({ toggleFullScreen, exitFullScreen } : ScoreControlProps) => {

    const zoom = useStore.use.zoom()
    const zoomIn = useStore.use.increaseZoom()
    const zoomOut = useStore.use.decreaseZoom()
    const setZoom = useStore.use.setZoom()

    const pageCount = useStore.use.pageCount()
    const currentPageNumber = useStore.use.currentPage()
    const setPage = useStore.use.setCurrentPage()

    const scoreProperties = useStore.use.scoreProperties()

    const numVersesAvailable = scoreProperties?.numVerses || 0
    const showNVerses = useStore.use.showNVerses()
    const setShowNVerses = useStore.use.setShowNVerses()

    const normalizeFicta = useStore.use.normalizeFicta()
    const setNormalizeFicta = useStore.use.setNormalizeFicta()

    const showEditorial = useStore.use.showEditorial()
    const setShowEditorial = useStore.use.setShowEditorial()

    const transposition = useStore.use.transposition()
    const setTransposition = useStore.use.setTransposition()

    const showComments = useStore.use.showComments()
    const setShowComments = useStore.use.setShowComments()

    const [openDrawer, setOpenDrawer] = useState(false);

    const showDrawer = () => {
        exitFullScreen()
        setOpenDrawer(true);
    };

    const onClose = () => {
        setOpenDrawer(false);
    };


    let verseOptions: SelectProps['options'] = Array.from({ length: numVersesAvailable }, (_, key) => 1 + key).map(i => ({
        value: i,
        label: `${i} verso${i > 1 ? "s" : ""}`

    }))

    const editorialDisabled = scoreProperties == null || !scoreProperties.hasEditorial
    const fictaSwictchDisabled = scoreProperties == null || !scoreProperties.hasFicta

    const getReverseTransposition = (transposition?: string) => {
        if (transposition == "-P4") {
            return "P4"
        }
        return ""
    }


    return (
        <div>

        <Drawer  title="Opciones de visualizacion" onClose={onClose} open={openDrawer}>
            <Space direction="vertical" size="large">
                <Row  align={"middle"}>
                    <Col span={20}>
                        <Space direction="vertical">
                            <Typography.Text strong={true} type={showComments ? undefined : "secondary"}>Comentarios de trabajo</Typography.Text>
                            <Typography.Text style={{ fontWeight: "lighter", fontSize: "0.8em" }} type={showComments ? undefined : "secondary"} >Click sobre una nota o un compás para ver los comentarios o añadir uno nuevo.</Typography.Text>
                        </Space>
                    </Col>
                    <Col span={4} >
                        <Switch value={showComments} defaultValue={false} onChange={() => setShowComments(!showComments)} />
                    </Col>
                </Row>
                <Row  align={"middle"}>
                    <Col span={20}>
                        <Space direction="vertical">
                            <Typography.Text strong={true} type={showEditorial ? undefined : "secondary"}>
                                Notas editoriales
                            </Typography.Text>
                            <Typography.Text style={{ fontWeight: "lighter", fontSize: "0.8em" }} type={showEditorial ? undefined : "secondary"}>
                                Muestra una capa con las notas críticas y elección de variantes variantes
                            </Typography.Text>
                        </Space>
                    </Col>
                    <Col span={4}>
                        <Switch value={showEditorial} defaultValue={false} disabled={editorialDisabled} onChange={() => setShowEditorial(!showEditorial)} />

                    </Col>
                </Row>
                <Row  align={"middle"}>
                    <Col span={20}>
                        <Space direction="vertical">
                            <Typography.Text strong={true} type={normalizeFicta ? undefined : "secondary"}>
                                Normalizar musica ficta
                            </Typography.Text>
                            <Typography.Text style={{ fontWeight: "lighter", fontSize: "0.8em" }} type={normalizeFicta ? undefined : "secondary"} >
                                Mostrar las alteraciones subintelectas de como las normales prececiendo a la nota
                            </Typography.Text>
                        </Space>
                    </Col>
                    <Col span={4}>
                        <Switch value={normalizeFicta} defaultValue={false} disabled={fictaSwictchDisabled} onChange={() => setNormalizeFicta(!normalizeFicta)} />

                    </Col>
                </Row>
                {scoreProperties?.encodedTransposition ?
                <Row  align={"middle"}>
                        <Col span={20}>
                            <Space direction="vertical">
                                <Typography.Text strong={true} type={transposition != null ? undefined : "secondary"}>
                                    Sin transposición
                                </Typography.Text>
                                <Typography.Text style={{ fontWeight: "lighter", fontSize: "0.8em" }} type={transposition != null ? undefined : "secondary"} >
                                    Muestra la partitura deshaciendo la transposición desde claves altas ({scoreProperties.encodedTransposition})
                                </Typography.Text>
                            </Space>
                        </Col>
                        <Col span={4}>
                            <Switch value={transposition != null}
                                defaultValue={false}
                                disabled={!scoreProperties?.encodedTransposition}
                                onChange={() => setTransposition(transposition == null ?
                                    getReverseTransposition(scoreProperties.encodedTransposition)
                                    : null)} />
                        </Col>
                    </Row> : null}

                {verseOptions.length > 0 ?
                <Row  align={"middle"}>
                        <Col span={16}>
                            <Space direction="vertical">
                                <Typography.Text strong={true} type={showNVerses ? undefined : "secondary"}>
                                    Limitar versos
                                </Typography.Text>
                                <Typography.Text style={{ fontWeight: "lighter", fontSize: "0.8em" }} type={showNVerses ? undefined : "secondary"} >
                                    Elige la cantidad de versos a mostrar en las coplas
                                </Typography.Text>
                            </Space>
                        </Col>
                        <Col span={8}>
                            <Select size="large"
                                options={verseOptions}
                                style={{ width: 120 }}
                                value={showNVerses}
                                defaultValue={numVersesAvailable}
                                disabled={numVersesAvailable <= 1}
                                onSelect={(value: number, _?: DefaultOptionType) => { setShowNVerses(value) }} />
                        </Col>
                    </Row>
                    : null}
            </Space>
            </Drawer>

        <Row  style={{ justifyContent: "left", backgroundColor: "white", padding: "0.2em" }}>
            <Col xl={{flex: '50%'}}
                 lg={{ flex: '50%' }}
                 md={{ flex: '50%' }}
                 sm={{ flex: '50%' }}
                 xs={{ flex: '100%' }}>
                <Space direction='horizontal'>
                    <SimpleIconButton icon={faMagnifyingGlassMinus} onClick={zoomOut} />
                    <Slider
                            min={Scale.MIN_SCALE}
                            max={Scale.MAX_SCALE}
                            step={0.1}
                            value={zoom}
                            onChange={setZoom}
                            style={{ width: 100 }}/>
                    <SimpleIconButton icon={faMagnifyingGlassPlus} onClick={zoomIn} />
                    <SimpleIconButton icon={faExpand} onClick={toggleFullScreen} />
                    <Button type="primary" onClick={showDrawer}>Opciones</Button>
                </Space>
           </Col>
           <Col xl={{flex: '50%'}}
                 lg={{ flex: '50%' }}
                 md={{ flex: '50%' }}
                 sm={{ flex: '50%' }}
                 xs={{ flex: '100%' }}>
                {pageCount > 1 ? (
                        <Pagination align="start" current={currentPageNumber}
                            defaultPageSize={1} total={pageCount} simple={false}
                            onChange={setPage} />
                    ) : null}
            </Col>
        </Row>

        </div>
    );
};

export default ScoreControls;