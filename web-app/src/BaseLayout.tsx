import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { Context } from './Context';
import { getJson, latestPdfsPath, TonoDef, tonoDefinitionsUrl } from './utils';
import { createBreakpoint } from 'react-use';


const useBreakpoint = createBreakpoint({ XL: 1281, L: 981, M: 737, S: 481 });

const Toggle = ({ toggle }: { toggle: () => void }) => {
    return (
        <a className="toggle" onClick={toggle}>Toggle</a>
    );
};


function BaseLayout() {

    const [definitions, setDefinitions] = useState<TonoDef[]>([])

    const [activeSidebar, setActiveSidebar] = useState(true);
    const [lastLocation, setLastLocation] = useState<string|null>(null)

    const mainDivRef = useRef<HTMLDivElement>(null)

    const location = useLocation()

    const toggle = () => setActiveSidebar(val => !val);

    const fetchDefinitions = async () => {
        const tonos = await getJson(tonoDefinitionsUrl)
        const pdflist = await getJson(latestPdfsPath)

        tonos.forEach((tono: TonoDef, index: number) => {
            tono.pdf_url = pdflist[index]
        })
        
        setDefinitions(tonos);
    };


    useEffect(() => {
        fetchDefinitions()
    }, []);

    const breakpoint = useBreakpoint()


    if (breakpoint != "XL" && breakpoint != "L") {
        if (lastLocation == null || lastLocation != location.pathname) {
            setLastLocation(location.pathname)
            setActiveSidebar(false)
        }
    }


    return (
        <Context.Provider value={{ definitions, setDefinitions, useBreakpoint }}>
            <div id="wrapper">
                <div ref={mainDivRef} id="main">
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