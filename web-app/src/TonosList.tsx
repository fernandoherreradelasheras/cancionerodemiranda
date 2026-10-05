import { Link } from 'react-router-dom';
import { useGlobalContext } from './Context';
import { ScoreViewerConfigScore } from 'score-viewer';
import { TonoStatus } from './utils';
import { Listy } from 'antd';
import PhaseStrip from './PhaseStrip';


// build_index.py writes "[Anónimo]" when the MEI names no author
const isKnownAuthor = (author?: string) => !!author && !["Anónimo", "[Anónimo]"].includes(author)

function getAuthors(tonoStatus: TonoStatus) {
    const authors = [
        isKnownAuthor(tonoStatus.music_author) ? `Música: ${tonoStatus.music_author}` : null,
        isKnownAuthor(tonoStatus.text_author) ? `Texto: ${tonoStatus.text_author}` : null,
    ].filter(Boolean)
    return authors.length > 0
        ? <span className="tono-authors">. {authors.join(" · ")}</span>
        : null
}

const TonoProgress = ({ tonoStatus }: { tonoStatus: TonoStatus }) =>
    <div className="tono-progress">
        <span className="tono-progress-label">Edición:</span>
        <PhaseStrip phases={tonoStatus.phases} compact />
        <span className="tono-progress-value">{Math.round(tonoStatus.progress * 100)} %</span>
    </div>



const TonoItem = ({ tonoConfig, tonoStatus, index }: { tonoConfig: ScoreViewerConfigScore, tonoStatus: TonoStatus, index: number }) => {

    return (
        <Link className="item-tono-status" to={`/tono/${index + 1}/`} state={{ tono: tonoConfig }}>
            <div style={{ marginTop: "0.2em", marginBottom: "0.2em" }}>
                <span className="tono-title">{index + 1}. {tonoConfig?.title}</span>{getAuthors(tonoStatus)}
            </div>
            <TonoProgress tonoStatus={tonoStatus} />
        </Link>
    )
}

const TonosList = () => {

    const { scoreViewerConfig, status: definitions } = useGlobalContext()

    if (!scoreViewerConfig?.scores || !definitions || definitions?.length <= 0) {
        return null
    }

    return (
        <Listy
            className="alt tono-list"
            classNames={{ item: "tono-list-item" }}
            items={scoreViewerConfig.scores.map((tonoConfig, index) => ({ tonoConfig, index }))}
            rowKey="index"
            itemRender={({ tonoConfig, index }) =>
                <TonoItem tonoConfig={tonoConfig} tonoStatus={definitions[index]} index={index} />
            }
        />
    );
};

export default TonosList;
