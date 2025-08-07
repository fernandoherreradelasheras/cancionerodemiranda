import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate  } from 'react-router-dom'
import { Context } from './Context';
import { getJson, latestPdfsPath, TonoStatus, statusUrl, config } from './utils';
import { faBars, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Location } from 'react-router-dom'

import { ConfigProvider, Layout, Menu, theme, Typography, Grid } from 'antd';

import { MenuInfo } from 'rc-menu/lib/interface';

import { isMobile } from 'react-device-detect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ScoreViewerConfig, ScoreViewerConfigScore } from 'score-viewer';


const { Header, Content } = Layout;
const { useBreakpoint } = Grid

library.add(faBars, faArrowLeft, faArrowRight)


const menuItemKeyFromLocationAndTono = (location: Location, currentTonoNumber: number | null) => {
    if (!location.pathname || location.pathname == "/") {
        return "/about"
    } else if (location.pathname.startsWith("/tono/") || currentTonoNumber) {
        return `sub1:/tono/${currentTonoNumber}`
    } else {
        return location.pathname
    }
}

const tonoNumberFromLocation = (location: Location) => {
    if (!location.pathname) {
        return null
    } else if (location.pathname.startsWith("/tono/") || location.pathname.startsWith("sub1:/tono/")) {
        return parseInt(location.pathname.replace(/.*tono\//, ""))
    } else {
        return null
    }
}


function BaseLayout() {
    const navigate = useNavigate()
    const location = useLocation()

    const breakpoint = useBreakpoint()

    const [currentTonoNumber, setCurrentTonoNumber] = useState<number | null>(tonoNumberFromLocation(location))
    const [status, setStatus] = useState<TonoStatus[]>([])
    const [scoreViewerConfig, setScoreViewerConfig] = useState<ScoreViewerConfig | undefined>(undefined)


    const {
        token: { colorBgContainer, borderRadiusLG },
      } = theme.useToken();


    useEffect(() => {
        const fetchDefinitions = async () => {
            const [statusFile, pdflistFile] = await Promise.all([getJson(statusUrl), getJson(latestPdfsPath)])
            statusFile.forEach((tono: TonoStatus, index: number) => {
                tono.pdfs = pdflistFile[index]
            })
            setStatus(statusFile);
        }

        setScoreViewerConfig(config)
        fetchDefinitions()
    }, []);

    const onMenuSelected = (info: MenuInfo) => {
        if (info.key.startsWith("sub1:/tono/") || info.key.startsWith("/tono/")) {
            const tonoNumber = parseInt(info.key.replace(/.*tono\//, ""))
            if (tonoNumber != currentTonoNumber) {
                setCurrentTonoNumber(tonoNumber)
            }
        } else {
            setCurrentTonoNumber(null)
            navigate(info.key)
        }
    }

    useEffect(() => {
        const tonoPath = currentTonoNumber ? `/tono/${currentTonoNumber}` : null
        if (tonoPath && tonoPath != location.pathname) {
            navigate(tonoPath)
        }
    }, [currentTonoNumber])


    useEffect(() => {
        const locationTonoNumber = tonoNumberFromLocation(location)
        if (locationTonoNumber &&  locationTonoNumber != currentTonoNumber) {
            setCurrentTonoNumber(locationTonoNumber)
        }
    }, [location])

    const selectorLabel = useMemo(() => {
        const scoreConfig =  currentTonoNumber && currentTonoNumber > 0 ? scoreViewerConfig?.scores[currentTonoNumber - 1] : null
        const title = scoreConfig?.title
        return title ? `Tono ${currentTonoNumber}: ${title}` : "Selecciona tono"
    }, [scoreViewerConfig, currentTonoNumber])


    const prevTono = useMemo(() => currentTonoNumber && currentTonoNumber > 1 ? `/tono/${currentTonoNumber - 1}` : "/tono/prev"
    , [currentTonoNumber])
    const nextTono = useMemo(() => currentTonoNumber && status && currentTonoNumber < status[status.length - 1]?.number! ? `/tono/${currentTonoNumber + 1}` : "/tono/next"
    , [currentTonoNumber, status])

    const items = useMemo(() => [
        breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ?
            { key: prevTono, icon: <FontAwesomeIcon size="2xs" icon={faArrowLeft} />, disabled: currentTonoNumber == null || prevTono == "/tono/prev" } : null,
        {
            key: 'sub1', label: selectorLabel, style: currentTonoNumber ? { fontWeight: "bolder" } : {}, children:
                scoreViewerConfig?.scores.map((s: ScoreViewerConfigScore, index: number) => {
                    const tonoNumber = `${index + 1}`
                    return { key: `sub1:/tono/${tonoNumber}`, label: `Tono ${tonoNumber}: ${s.title}` }
                })
        },
        breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ?
            { key: nextTono, icon: <FontAwesomeIcon icon={faArrowRight} />, disabled: currentTonoNumber == null || nextTono == "/tono/next" } : null,
        { key: "/tonos", label: "Listado de tonos", style: location.pathname == "/tonos" ? { fontWeight: "bolder" } : {} },
        { key: "/progreso", label: "Progreso", style: location.pathname == "/progreso" ? { fontWeight: "bolder" } : {} },
        { key: "/about", label: "Acerca de", style: location.pathname == "/about" || location.pathname == "/" ? { fontWeight: "bolder" } : {} }
    ].filter(i => i !== null) as any
    ,[breakpoint, prevTono, nextTono, selectorLabel, scoreViewerConfig, currentTonoNumber, location.pathname])

    const selectedKeys = useMemo(() => {
        return [menuItemKeyFromLocationAndTono(location, currentTonoNumber)]
    }, [location, currentTonoNumber])


    return (
        <Context.Provider value={{ status: status, setStatus: setStatus, scoreViewerConfig, setScoreViewerConfig, currentTonoNumber, setCurrentTonoNumber }}>
            <ConfigProvider
                theme={{
                    algorithm: theme.defaultAlgorithm,
                    token: {
                        colorPrimary: "#654321",
                        colorInfo: "#654321",
                        fontSize: isMobile ? 12 : 16
                     },
                    components: {
                        Layout: {
                            headerHeight: 48,
                            headerBg: "#ffffff"
                        },
                        Slider: {
                            railBg: "rgba(0,0,0,0.24)"
                        }
                      },
                }}>

                <Layout>
                    <Header style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center' }}>
                            <Typography.Title level={2}>
                                {breakpoint.xxl || breakpoint.xl || breakpoint.lg ? "Cancionero de Miranda" : "CdM"}
                            </Typography.Title>

                            { status.length > 0 ? <Menu
                                mode="horizontal"
                                subMenuCloseDelay={0.3}
                                selectedKeys={selectedKeys}
                                items={items}
                                onSelect={onMenuSelected}
                                style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}/> : null }
                    </Header>
                    <Content style={{ padding: '0 24px', background: colorBgContainer }}>
                        <div style={{
                                background: colorBgContainer,
                                minHeight: 280,
                                padding: "0px 24px 0 24px",
                                borderRadius: borderRadiusLG  }}>

                            <Outlet />

                        </div>
                    </Content>
                </Layout>
            </ConfigProvider>
        </Context.Provider>
    )
}

export default BaseLayout
