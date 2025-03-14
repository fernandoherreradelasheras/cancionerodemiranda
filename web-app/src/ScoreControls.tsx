import { useState } from 'react';
import { Space, Pagination, Slider, SelectProps, Select, Switch, Drawer, Button, Col, Row } from 'antd';
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus, faExpand } from '@fortawesome/free-solid-svg-icons';
import SimpleIconButton from './SimpleIconButton';
import { Scale } from './uidefs';
import useStore from "./store";
import { DefaultOptionType } from 'antd/es/select';
import AudioPlayer from './AudioPlayer';


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

    const scoreAudioFile = useStore.use.scoreAudioFile()
    const scoreSvg = useStore.use.scoreSvg()

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


    return (
        <div>

            <Drawer title="Opciones de visualizacion" onClose={onClose} open={openDrawer}>
                <Space direction='vertical'>
                    <Space>
                        <Switch value={showEditorial} defaultValue={false} disabled={editorialDisabled} onChange={() => setShowEditorial(!showEditorial)} />
                        <span>Mostrar notas editoriales</span>
                    </Space>
                    <Space>
                        <Switch value={normalizeFicta} defaultValue={false} disabled={fictaSwictchDisabled} onChange={() => setNormalizeFicta(!normalizeFicta)} />
                        <span>Normalizar alteraciones ficta</span>
                    </Space>

                    {verseOptions.length > 0 ? (
                        <Space>
                            <span>Versos mostrados: </span>
                            <Select size="large"
                                options={verseOptions}
                                style={{ width: 120 }}
                                value={showNVerses}
                                defaultValue={numVersesAvailable}
                                disabled={numVersesAvailable <= 1}
                                onSelect={(value: number, _?: DefaultOptionType) => { setShowNVerses(value) }} />
                        </Space>
                    ) : null}
                </Space>
            </Drawer>

        <Row  style={{ justifyContent: "left", backgroundColor: "white", padding: "0.2em" }}>
            <Col xl={{flex: '30%'}}
                 lg={{ flex: '30%' }}
                 md={{ flex: '30%' }}
                 sm={{ flex: '30%' }}
                 xs={{ flex: '50%' }}>
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
           <Col xl={{flex: '40%'}}
                 lg={{ flex: '40%' }}
                 md={{ flex: '40%' }}
                 sm={{ flex: '40%' }}
                 xs={{ flex: '50%' }}>
                {pageCount > 1 ? (
                        <Pagination align="start" current={currentPageNumber}
                            defaultPageSize={1} total={pageCount} simple={false}
                            onChange={setPage} />
                    ) : null}
            </Col>
            <Col xl={{flex: '30%'}}
                 lg={{ flex: '30%' }}
                 md={{ flex: '30%' }}
                 sm={{ flex: '30%' }}
                 xs={{ flex: '100%' }}>
                {scoreAudioFile ?
                    <AudioPlayer
                        enabled={scoreSvg != null} />
                    : null}
            </Col>
        </Row>



        </div>
    );
};

export default ScoreControls;