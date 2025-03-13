import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate  } from 'react-router-dom'
import { Context } from './Context';
import { getJson, latestPdfsPath, TonoDef, tonoDefinitionsUrl } from './utils';
import { faBars } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'

import { ConfigProvider, Layout, Menu, theme, Typography } from 'antd';

import mp3_files from "./assets/mp3-files.json"
import { MenuInfo } from 'rc-menu/lib/interface';

import { isMobile } from 'react-device-detect';
import useVerovio from './hooks/useVerovio';


type Mp3Files = {
    [key:string] : string
}

const { Header, Content } = Layout;

library.add(faBars)



function BaseLayout() {

    const [definitions, setDefinitions] = useState<TonoDef[]>([])
    const [scoreCache, setScoreCache] = useState<{[index: string] : string }>({})

    const navigate = useNavigate()
    const location = useLocation()
    const verovio = useVerovio()


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
    };

    const onMenuClick = (info: MenuInfo) => {
        navigate(info.key)
    }


    useEffect(() => {
        fetchDefinitions()
    }, []);


    const currentPath = location?.pathname
    const selectedTonoNumber =  currentPath?.startsWith("/tono/") ? parseInt(currentPath.replace("/tono/", "")) : null
    const selectorLabel = selectedTonoNumber ?  `Tono ${selectedTonoNumber}: ${definitions.find(t => t.number == selectedTonoNumber)?.title}` : "Selecciona tono"

    const items = [
        { key: 'sub1',   label: selectorLabel, style: selectedTonoNumber ?  {fontWeight: "bolder"} :  {},  children:
            definitions.map(t => ( {  key: `/tono/${t.number}`, label: `Tono ${t.number}: ${t.title}` } )) },
        { key: "/tonos", label: "Listado de tonos" },
        { key: "/about", label: "Acerca de" },
    ]

    const selectedMenuItemKey = currentPath ? currentPath  : "/about"

    return (
        <Context.Provider value={{ definitions, setDefinitions, scoreCache, setScoreCache, verovio }}>
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
                            <div className="demo-logo" style={{color: "#000000"}}>
                                <Typography.Title level={2}>El cancionero de Miranda</Typography.Title>
                            </div>
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
                                padding: "4px 24px 0 24px",
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