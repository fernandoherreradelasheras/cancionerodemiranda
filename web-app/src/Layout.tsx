import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Context } from './Context';
import { getJson, latestPdfsUrl, repoRoot, TonoDef, tonoDefinitions } from './utils';



const Toggle = ({ toggle }: { toggle: () => void }) => {
    return (
        <a className="toggle" onClick={toggle}>
        </a>
    );
};


function Layout() {
    const [definitions, setDefinitions] = useState<TonoDef[]>([])

    const [activeSidebar, setActiveSidebar] = useState(true);
    const toggle = () => setActiveSidebar(val => !val);

    const fecchDefinitions = async () => {

        let urls = tonoDefinitions.map(d => repoRoot + "tonos/" + d)

        const texts = await Promise.all(
            urls.map(async (url) => {     
                const resp = await fetch(url);
                return resp.json();
            })
        );

 
        let dataCollected = texts.reduce((dataCollected, response) => {
            dataCollected = dataCollected.concat(response);
            return dataCollected;
        }, []);

        const pdflist = await getJson(latestPdfsUrl)

        dataCollected.forEach((tono: TonoDef, index: number) => {
            tono.path = tonoDefinitions[index].substring(0, tonoDefinitions[index].lastIndexOf("/"));
            tono.number = index + 1
            tono.pdf_url = pdflist[index]
        })
        setDefinitions(dataCollected);
    };



    useEffect(() => {
        fecchDefinitions()
    }, []);


    return (
        <Context.Provider value={{ definitions, setDefinitions }}>
            <div id="wrapper">
                <div id="main">
                    <div className="inner">
                        <header id="header">
                            <span><strong>Cancionero de Miranda</strong>: una edición en progreso</span>
                        </header>
                        <Outlet />
                    </div>
                </div>
                <div id="sidebar" className={activeSidebar ? "" : "inactive"}>

                    <Sidebar />
                    <Toggle toggle={toggle} />

                </div>
            </div>
        </Context.Provider>

    )
}

export default Layout