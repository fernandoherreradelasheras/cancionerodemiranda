import { Card, Progress, Row, Col, Statistic, Typography, Divider } from 'antd';
import { Link } from 'react-router-dom';
import { useGlobalContext } from './Context';
import { calculateTonoStats, PHASE_GROUPS, PhaseState } from './utils';
import PhaseStrip, { PhaseLegend } from './PhaseStrip';

const { Title, Text } = Typography;

const SEGMENTS: { state: PhaseState, color: string }[] = [
    { state: "done", color: "var(--phase-done)" },
    { state: "in_progress", color: "var(--phase-in-progress)" },
    { state: "pending", color: "var(--phase-pending)" },
]

/* One phase: how many of the tonos it applies to are done, in progress or pending */
function PhaseRow({ label, counts }: { label: string, counts: Record<PhaseState, number> }) {
    const total = counts["done"] + counts["in_progress"] + counts["pending"]
    return (
        <div className="phase-row">
            <Text className="phase-row-label">{label}</Text>
            <div className="phase-row-bar" role="img"
                aria-label={`${counts["done"]} hechos, ${counts["in_progress"]} en curso, ${counts["pending"]} pendientes de ${total}`}>
                {SEGMENTS.map(({ state, color }) => counts[state] > 0
                    ? <div key={state} style={{ flex: counts[state], backgroundColor: color }} />
                    : null)}
            </div>
            <Text type="secondary" className="phase-row-count">
                {counts["done"]}{counts["in_progress"] > 0 ? ` (+${counts["in_progress"]})` : ""} / {total}
            </Text>
        </div>
    )
}

function Dashboard() {
    const { scoreViewerConfig, status: definitions } = useGlobalContext();

    if (!scoreViewerConfig?.scores || !definitions) {
        return (
            <Card>
                <Text>Cargando estadísticas del proyecto...</Text>
            </Card>
        );
    }

    const totalWorks = scoreViewerConfig.scores.length;
    const stats = calculateTonoStats(scoreViewerConfig.scores, definitions);
    const overallCompletion = Math.round(stats.progress * 100)

    return (
        <div className="dashboard" style={{ margin: '2em 0' }}>
            <Title level={1} style={{ textAlign: 'start', marginBottom: '1.5em', fontSize: '1.5em' }}>
                Informe de progreso
            </Title>

            <Card style={{ marginBottom: '1.5em', textAlign: 'center' }}>
                <Title level={4}>Progreso general de la edición</Title>
                <Row gutter={24} justify="center">
                    <Col xs={8}>
                        <Statistic title="Total de tonos" value={totalWorks} />
                    </Col>
                    <Col xs={8}>
                        <Statistic title="Fases completadas" value={overallCompletion} suffix="%" />
                    </Col>
                    <Col xs={8}>
                        <Statistic title="Tonos terminados" value={stats.completed} suffix={`/${totalWorks}`} />
                    </Col>
                </Row>
                <Progress percent={overallCompletion} strokeColor="var(--phase-done)" style={{ marginTop: '1em' }} />
                <Text type="secondary" style={{ fontSize: '0.9em' }}>
                    Cada tono cuenta solo las fases que necesita; una fase en curso cuenta la mitad.
                </Text>
            </Card>

            <Card style={{ marginBottom: '1.5em' }}>
                <Title level={4}>Por fase</Title>
                <PhaseLegend />
                {PHASE_GROUPS.map(group =>
                    <div key={group.label}>
                        <Divider titlePlacement="start">{group.label}</Divider>
                        {group.phases.map(({ key, label }) =>
                            <PhaseRow key={key} label={label} counts={stats.phases[key]} />)}
                    </div>
                )}
                <Text type="secondary" style={{ fontSize: '0.9em', display: 'block', marginTop: '1em' }}>
                    Hechos (+ en curso) / tonos a los que aplica la fase.
                </Text>
            </Card>

            <Card>
                <Title level={4}>Por tono</Title>
                <PhaseLegend />
                <div className="phase-matrix">
                    {scoreViewerConfig.scores.map((tonoConfig, index) => definitions[index]
                        ? <Link key={index} to={`/tono/${index + 1}/`} state={{ tono: tonoConfig }}
                            className="phase-matrix-row" title={tonoConfig.title}>
                            <span className="phase-matrix-number">{index + 1}</span>
                            <PhaseStrip phases={definitions[index].phases} compact />
                        </Link>
                        : null)}
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
