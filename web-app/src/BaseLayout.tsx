import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate  } from 'react-router-dom'
import { Context } from './Context';
import { getJson, getTonoUrl, latestPdfsPath, Mp3Files, TonoDef, tonoDefinitionsUrl } from './utils';
import { faBars, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Location } from 'react-router-dom'

import { ConfigProvider, Layout, Menu, theme, Typography, Grid } from 'antd';

import mp3_files from "./assets/mp3-files.json"
import { MenuInfo } from 'rc-menu/lib/interface';

import { isMobile } from 'react-device-detect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';



const { Header, Content } = Layout;
const { useBreakpoint } = Grid

library.add(faBars, faArrowLeft, faArrowRight)

const builldScoreViewerConfig = (tonos: TonoDef[]) => {
    const config = {
        settings: {
            renderTitlesFromMEI: true,
            showScoreSelector: false,
            backgroundColor: "#f6eee3"
        },
        scores: tonos.map((tono: TonoDef) => {
            return {
                title: tono.title,
                audioUrl: tono.base_mp3_file,
                audioOverlays: tono.mp3_overlays,
                meiUrl: getTonoUrl(tono.path, tono.mei_file),
                encodingProperties: {
                    encodedTransposition: tono.transposition
                  }
            }
        })
    }
    return config
}

const menuItemKeyFromLocationAndTono = (location: Location, currentTonoNumber: number|null) => {
    if (!location.pathname) {
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
    const [definitions, setDefinitions] = useState<TonoDef[]>([])
    const [scoreViewerConfig, setScoreViewerConfig] = useState<any | null>(null)



    const {
        token: { colorBgContainer, borderRadiusLG },
      } = theme.useToken();




    const fetchDefinitions = async () => {
        const tonos = await getJson(tonoDefinitionsUrl)
        const pdflist = await getJson(latestPdfsPath)
        const mp3 = (mp3_files as Mp3Files)
        tonos.forEach((tono: TonoDef, index: number) => {
            tono.pdf_url = pdflist[index]
            if (Object.keys(mp3).includes(tono.number.toString())) {
                const mp3_info = mp3[`${tono.number}`]
                tono.base_mp3_file = mp3_info.base
                tono.mp3_overlays = mp3_info.overlays
            }
        })

        setDefinitions(tonos);
        setScoreViewerConfig(builldScoreViewerConfig(tonos))
    };

    useEffect(() => {
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
        return currentTonoNumber ? `Tono ${currentTonoNumber}: ${definitions.find(t => t.number == currentTonoNumber)?.title}` : "Selecciona tono"
    }, [definitions, currentTonoNumber])

    const prevTono = currentTonoNumber && currentTonoNumber > 1 ? `/tono/${currentTonoNumber - 1}` : "/tono/prev"
    const nextTono = currentTonoNumber && definitions && currentTonoNumber < definitions.at(-1)?.number! ? `/tono/${currentTonoNumber + 1}` : "/tono/next"



    const items = [
        breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ?
            { key: prevTono, icon: <FontAwesomeIcon size="2xs" icon={faArrowLeft}/>, disabled: currentTonoNumber == null || prevTono == "/tono/prev" } : null,
        { key: 'sub1',   label: selectorLabel, style: currentTonoNumber ?  {fontWeight: "bolder"} :  {},  children:
            definitions.map(t => ( {  key: `sub1:/tono/${t.number}`, label: `Tono ${t.number}: ${t.title}` } )) },
        breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ?
        { key: nextTono,  icon: <FontAwesomeIcon icon={faArrowRight}/>, disabled: currentTonoNumber == null || nextTono == "/tono/next" } : null,
        { key: "/tonos", label: "Listado de tonos", style: location.pathname == "/tonos" ?  {fontWeight: "bolder"} :  {} },
        { key: "/about", label: "Acerca de", style: location.pathname == "/about" ?  {fontWeight: "bolder"} :  {} },
    ].filter(i => i !== null) as any


    return (
        <Context.Provider value={{ definitions, setDefinitions, scoreViewerConfig, setScoreViewerConfig, currentTonoNumber, setCurrentTonoNumber }}>
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

                            { definitions.length > 0 ? <Menu
                                mode="horizontal"
                                subMenuCloseDelay={0.3}
                                defaultSelectedKeys={[ menuItemKeyFromLocationAndTono(location, currentTonoNumber)]}
                                selectedKeys={[ menuItemKeyFromLocationAndTono(location, currentTonoNumber)]}
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