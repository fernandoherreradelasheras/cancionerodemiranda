import TonoView from "./TonoView";
import { useContext, useMemo } from "react";
import { Context } from "./Context";
import PageTitle from "./PageTitle";

const Tono = () => {

    const { scoreViewerConfig, currentTonoNumber } = useContext(Context)

    const tonoIndex = useMemo(() => {
        return currentTonoNumber ? currentTonoNumber - 1 : null
    }, [currentTonoNumber, scoreViewerConfig])


    return (
        <>
            { tonoIndex == null && <div>Cargando...</div> }
            { tonoIndex != null && <PageTitle title={ `${scoreViewerConfig?.scores[tonoIndex].title} · Tono ${tonoIndex + 1} · Cancionero de Miranda`} /> }
            <TonoView tonoIndex={tonoIndex} />
        </>
    )



}
export default Tono;
