import TonoView from "./TonoView";
import { useContext, useMemo } from "react";
import { Context } from "./Context";
import PageTitle from "./PageTitle";

const Tono = () => {

    const { definitions, currentTonoNumber } = useContext(Context)

    const tono = useMemo(() => {
        return currentTonoNumber > 0 ? definitions[currentTonoNumber - 1] : null
    }, [currentTonoNumber, definitions])


    if (tono == null) {
        return (<div>Cargando...</div>)
    } else {
        const title = `Cancionero de Miranda - ${tono.title}`
        return (
            <>
                <PageTitle title={title} />
                <TonoView tono={tono} />
            </>
        )
   }


}
export default Tono;
