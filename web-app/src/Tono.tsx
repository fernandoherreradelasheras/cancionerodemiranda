import TonoView from "./TonoView";
import { useContext, useMemo } from "react";
import { Context } from "./Context";
import PageTitle from "./PageTitle";

const Tono = () => {

    const { scoreViewerConfig, currentTonoNumber } = useContext(Context)

    const tonoConfig = useMemo(() => {
        return currentTonoNumber && scoreViewerConfig?.scores ? scoreViewerConfig.scores[currentTonoNumber - 1] : null
    }, [currentTonoNumber, scoreViewerConfig])


    if (tonoConfig == null) {
        return (<div>Cargando...</div>)
    } else {
        const title = `Cancionero de Miranda - ${tonoConfig.title}`
        return (
            <>
                <PageTitle title={title} />
                <TonoView tonoConfig={tonoConfig} />
            </>
        )
   }


}
export default Tono;
