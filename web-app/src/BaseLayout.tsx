import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Context } from './Context';
import { getJson, latestPdfsUrl, repoRoot, TonoDef, tonoDefinitionsPath } from './utils';



const Toggle = ({ toggle }: { toggle: () => void }) => {
    return (
        <a className="toggle" onClick={toggle}>Toggle</a>
    );
};


function BaseLayout() {
    const [definitions, setDefinitions] = useState<TonoDef[]>([])

    const [activeSidebar, setActiveSidebar] = useState(true);
    const toggle = () => setActiveSidebar(val => !val);

    const fecchDefinitions = async () => {


        const tonos = await getJson(repoRoot + tonoDefinitionsPath)

        const pdflist = await getJson(latestPdfsUrl)

        tonos.forEach((tono: TonoDef, index: number) => {
            tono.pdf_url = pdflist[index]
            if (index == 38) tono.mp3_file = "/39.mp3" // TESTING
        })
        
        setDefinitions(tonos);
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

export default BaseLayout