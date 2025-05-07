import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate  } from 'react-router-dom'
import { Context } from './Context';
import { getJson, getTonoUrl, latestPdfsPath, TonoDef, tonoDefinitionsUrl } from './utils';
import { faBars, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'

import { ConfigProvider, Layout, Menu, theme, Typography, Grid } from 'antd';

import mp3_files from "./assets/mp3-files.json"
import { MenuInfo } from 'rc-menu/lib/interface';

import { isMobile } from 'react-device-detect';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';


type Mp3Files = {
    [key:string] : string
}

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
                audioUrl: tono.mp3_file,
                meiUrl: getTonoUrl(tono.path, tono.mei_file),
                encodingProperties: {
                    encodedTransposition: tono.transposition
                  }
            }
        })
    }
    return config
}



function BaseLayout() {

    const [definitions, setDefinitions] = useState<TonoDef[]>([])
    const [scoreViewerConfig, setScoreViewerConfig] = useState<any | null>(null)

    const navigate = useNavigate()
    const location = useLocation()

    const breakpoint = useBreakpoint()

    const {
        token: { colorBgContainer, borderRadiusLG },
      } = theme.useToken();




    const fetchDefinitions = async () => {
        const tonos = await getJson(tonoDefinitionsUrl)
        const pdflist = await getJson(latestPdfsPath)

        tonos.forEach((tono: TonoDef, index: number) => {
            tono.pdf_url = pdflist[index]
            tono.mp3_file = (mp3_files as Mp3Files)[`${tono.number}`]
        })

        setDefinitions(tonos);
        setScoreViewerConfig(builldScoreViewerConfig(tonos))
    };

    const onMenuClick = (info: MenuInfo) => {
        navigate(info.key.split(":").at(-1)!)
    }


    useEffect(() => {
        fetchDefinitions()
    }, []);


    const currentPath = location?.pathname
    const showingTono = currentPath?.startsWith("/tono/") || false
    const selectedTonoNumber =  showingTono ? parseInt(currentPath.replace("/tono/", "")) : null
    const selectorLabel = selectedTonoNumber ?  `Tono ${selectedTonoNumber}: ${definitions.find(t => t.number == selectedTonoNumber)?.title}` : "Selecciona tono"
    const prevTono = selectedTonoNumber && selectedTonoNumber > 1 ? `/tono/${selectedTonoNumber - 1}` : "/tono/prev"
    const nextTono = selectedTonoNumber && definitions && selectedTonoNumber < definitions.at(-1)?.number! ? `/tono/${selectedTonoNumber + 1}` : "/tono/next"

    const items = [
        breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ? { key: prevTono, icon: <FontAwesomeIcon size="2xs" icon={faArrowLeft}/>, disabled: !showingTono} : null,
        { key: 'sub1',   label: selectorLabel, style: selectedTonoNumber ?  {fontWeight: "bolder"} :  {},  children:
            definitions.map(t => ( {  key: `sub1:/tono/${t.number}`, label: `Tono ${t.number}: ${t.title}` } )) },
            breakpoint.xxl || breakpoint.xl || breakpoint.lg || breakpoint.md ? { key: nextTono,  icon: <FontAwesomeIcon icon={faArrowRight}/>, disabled: !showingTono} : null,
        { key: "/tonos", label: "Listado de tonos" },
        { key: "/about", label: "Acerca de" },
    ].filter(i => i !== null) as any

    const selectedMenuItemKey = currentPath ? currentPath  : "/about"

    return (
        <Context.Provider value={{ definitions, setDefinitions, scoreViewerConfig, setScoreViewerConfig }}>
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

                            <Menu
                                mode="horizontal"
                                subMenuCloseDelay={0.3}
                                defaultSelectedKeys={[selectedMenuItemKey]}
                                items={items}
                                onClick={onMenuClick}
                                style={{ flex: 1, minWidth: 0, justifyContent: 'flex-end' }}/>
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