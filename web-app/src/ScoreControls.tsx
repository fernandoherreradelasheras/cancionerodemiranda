import React from 'react';
import { Space, Flex, Pagination, Slider, SelectProps, Select, Switch } from 'antd';
import { faMagnifyingGlassMinus, faMagnifyingGlassPlus, faExpand } from '@fortawesome/free-solid-svg-icons';
import SimpleIconButton from './SimpleIconButton';
import { Scale } from './uidefs';
import useStore from "./store";
import { DefaultOptionType } from 'antd/es/select';
import AudioPlayer from './AudioPlayer';


interface ScoreControlProps {
    toggleFullScreen: () => void
    verseSelector: React.ReactNode
}

const ScoreControls = ({ toggleFullScreen } : ScoreControlProps) => {

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

    let verseOptions: SelectProps['options'] = Array.from({ length: numVersesAvailable }, (_, key) => 1 + key).map(i => ({
        value: i,
        label: `${i} verso${i > 1 ? "s" : ""}`
    }))

    const editorialDisabled = scoreProperties == null || !scoreProperties.hasEditorial
    const fictaSwictchDisabled = scoreProperties == null || !scoreProperties.hasFicta


    return (
        <Flex style={{ justifyContent: "space-between", backgroundColor: "white", padding: "0.2em" }}>
            <Space>
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

                <Space>
                    <span>Notas editoriales</span>
                    <Switch value={showEditorial} defaultValue={false} disabled={editorialDisabled} onChange={() => setShowEditorial(!showEditorial)}/>
                </Space>
                <Space>
                    <span>Normalizar ficta</span>
                    <Switch value={normalizeFicta} defaultValue={false} disabled={fictaSwictchDisabled} onChange={() => setNormalizeFicta(!normalizeFicta)}/>
                </Space>


                { verseOptions.length > 0 ? (
                    <Select size="large"
                        options={verseOptions}
                        style={{ width: 120 }}
                        value={showNVerses}
                        defaultValue={numVersesAvailable}
                        disabled={numVersesAvailable <= 1}
                        onSelect={(value: number, _?: DefaultOptionType) => {setShowNVerses(value)}}/>
                ) : null }

            </Space>

            {pageCount > 1 ? (
                <Pagination align="start" current={currentPageNumber}
                    defaultPageSize={1} total={pageCount} simple={false}
                    onChange={setPage} />
            ) : null}

            {scoreAudioFile ?
                <AudioPlayer
                    enabled={scoreSvg != null} />
                : null}
        </Flex>
    );
};

export default ScoreControls;