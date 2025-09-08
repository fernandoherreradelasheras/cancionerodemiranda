import { Card, Progress, Row, Col, Statistic, Space, Typography, Divider } from 'antd';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileLines, faMarker, faMusic, faHighlighter, faHeadphones,
    faListCheck, faPersonBooth, faAlignJustify, faStamp
} from '@fortawesome/free-solid-svg-icons';
import { useGlobalContext } from './Context';
import { calculateTonoStats } from './utils';

const { Title, Text } = Typography;

interface StatusCardProps {
    title: string;
    icon: any;
    completed: number;
    total: number;
    color: string;
    description: string;
}

function StatusCard({ title, icon, completed, total, color, description }: StatusCardProps) {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <Card size="small" className="status-card" style={{ height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text strong>{title}</Text>
                    <FontAwesomeIcon icon={icon} style={{ color: color, fontSize: '1.2em' }} />
                </div>
                <Progress
                    percent={percentage}
                    strokeColor={color}
                    size="small"
                    format={() => `${completed}/${total}`}
                />
                <Text type="secondary" style={{ fontSize: '0.9em' }}>{description}</Text>
            </Space>
        </Card>
    );
};

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

    const overallCompletion = Math.round(
        ((stats.textValidated + stats.musicValidated) / (totalWorks * 2)) * 100
    ); return (
        <div className="dashboard" style={{ margin: '2em 0' }}>
            <Title level={3} style={{ textAlign: 'start', marginBottom: '1.5em' }}>
                Informe de progreso
            </Title>

            <Card style={{ marginBottom: '1.5em', textAlign: 'center' }}>
                <Title level={4}>Progreso General de la edición</Title>
                <Row gutter={24} justify="center">
                    <Col xs={12} sm={6} md={4}>
                        <Statistic title="Total de Tonos" value={totalWorks} />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Statistic
                            title="Completados"
                            value={overallCompletion}
                            suffix="%"
                            valueStyle={{ color: overallCompletion > 50 ? '#3f8600' : '#cf1322' }}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Statistic title="Voz perdida reconstruida" value={stats.voiceReconstructed} suffix={`/${stats.needsReconstruction}`} />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Statistic title="Textos poéticos validados" value={stats.textValidated} suffix={`/${totalWorks}`} />
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                        <Statistic title="Transcripciones musicales validadas" value={stats.musicValidated} suffix={`/${totalWorks}`} />
                    </Col>
                </Row>
                <Progress
                    percent={overallCompletion}
                    strokeColor={{
                        '0%': '#ff4d4f',
                        '50%': '#faad14',
                        '100%': '#52c41a',
                    }}
                    style={{ marginTop: '1em' }}
                />
            </Card>


            <Row gutter={[8, 8]}>
                <Divider orientation="left">Estudios e introducciones</Divider>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Introducciones"
                        icon={faPersonBooth}
                        completed={stats.hasIntro}
                        total={totalWorks}
                        color="#722ed1"
                        description="Tonos con introducción"
                    />
                </Col>
            </Row>
            <Row gutter={[8, 8]}>
                <Divider orientation="left">Texto poético</Divider>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Texto Transcrito"
                        icon={faFileLines}
                        completed={stats.hasText}
                        total={totalWorks}
                        color="#1890ff"
                        description="Tonos con el texto transcrito"
                    />
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Coplas Alineadas"
                        icon={faMarker}
                        completed={stats.textCompleted}
                        total={totalWorks}
                        color="#52c41a"
                        description="Tonos con todas las coplas alineadas en la partitura"
                    />
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Texto Validado"
                        icon={faAlignJustify}
                        completed={stats.textValidated}
                        total={totalWorks}
                        color="#13c2c2"
                        description="Tonos con texto revisado"
                    />
                </Col>
            </Row>
            <Row gutter={[8, 8]}>
                <Divider orientation="left">Transcripción Musical</Divider>
            </Row>
            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Transcripción musical iniciada"
                        icon={faMusic}
                        completed={stats.hasMusic}
                        total={totalWorks}
                        color="#fa8c16"
                        description="Tonos con transcripción musical iniciada"
                    />
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Transcripción musical completa"
                        icon={faHighlighter}
                        completed={stats.musicTranscriptionCompleted}
                        total={totalWorks}
                        color="#eb2f96"
                        description="Tonos con transcripción musical finalizada"
                    />
                </Col>


                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Voces reconstruidas"
                        icon={faListCheck}
                        completed={stats.voiceReconstructed}
                        total={stats.needsReconstruction}
                        color="#f5222d"
                        description="Tonos con reconstrucción de la voz perdida (o sin voz perdida)"
                    />
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Demo de audio disponible"
                        icon={faHeadphones}
                        completed={stats.hasAudio}
                        total={totalWorks}
                        color="#722ed1"
                        description="Tonos con demo de audio de la transcripción musical"
                    />
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <StatusCard
                        title="Música Validada"
                        icon={faStamp}
                        completed={stats.musicValidated}
                        total={totalWorks}
                        color="#389e0d"
                        description="Música revisada y validada"
                    />
                </Col>
            </Row>


            <Row gutter={[8, 8]} justify="center" align="middle" style={{ marginTop: '2em' }}>
                <Divider orientation="center">Resumen</Divider>
            </Row>

            <Row gutter={24} justify="center" align="middle">
                <Col xs={24} md={12}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        minHeight: '200px'
                    }}>
                        <div className="pie-chart" style={{ position: 'relative', marginBottom: '1em' }}>
                            <div
                                style={{
                                    width: '150px',
                                    height: '150px',
                                    borderRadius: '50%',
                                    background: `conic-gradient(
                                            #ff4d4f 0deg ${stats.incompleted / totalWorks * 360}deg,
                                            #52c41a ${stats.completed / totalWorks * 360}deg 360deg
                                        )`,
                                    position: 'relative',
                                    border: '4px solid #f0f0f0'
                                }}
                            >
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        width: '100px',
                                        height: '100px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Text strong style={{ fontSize: '1.2em', color: '#2c3e50' }}>
                                        {overallCompletion}%
                                    </Text>
                                    <Text type="secondary" style={{ fontSize: '0.8em' }}>
                                        Completado
                                    </Text>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <Space direction="vertical" size="small" style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#52c41a',
                                        borderRadius: '2px',
                                        marginRight: '8px'
                                    }}
                                />
                                <Text>Tonos Completados: {stats.completed} / {totalWorks}</Text>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#ff4d4f',
                                        borderRadius: '2px',
                                        marginRight: '8px'
                                    }}
                                />
                                <Text>Tonos Pendientes: {stats.incompleted} / {totalWorks}</Text>
                            </div>
                        </Space>
                    </div>
                </Col>

            </Row>



        </div>
    );
};

export default Dashboard;
