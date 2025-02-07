import TonoView from "./TonoView";
import { useContext } from "react";
import { Context } from "./Context";
import { useParams } from "react-router-dom";

const Tono = () => {

    const { definitions } = useContext(Context)

    const params = useParams();
    const tonoIndex = params.tonoNumber != undefined ? parseInt(params.tonoNumber) - 1 : -1
    const tono = definitions[tonoIndex]
   

    if (tono == null) {
        return (<div>Cargando...</div>)
    } else {

        return (
            <TonoView tono={tono} />
        )
    }


}
export default Tono;
