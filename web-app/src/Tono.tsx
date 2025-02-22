import TonoView from "./TonoView";
import { useContext } from "react";
import { Context } from "./Context";
import { useParams } from "react-router-dom";
import { useOrientation } from "react-use";

const Tono = () => {

    const { definitions, useBreakpoint } = useContext(Context)

    const params = useParams();
    const orientation = useOrientation();
    const breakpoint = useBreakpoint();

    const tonoIndex = params.tonoNumber != undefined ? parseInt(params.tonoNumber) - 1 : -1
    const tono = definitions[tonoIndex]
   

    if (tono == null) {
        return (<div>Cargando...</div>)
    } else if (breakpoint != "XL" && breakpoint != "L" && orientation.type == "portrait-primary") {
        return (<div>Para visualizar los tonos, rote la pantalla a modo horizontal</div>)
    } else {
        return (
            <TonoView tono={tono} />
        )
    }


}
export default Tono;
