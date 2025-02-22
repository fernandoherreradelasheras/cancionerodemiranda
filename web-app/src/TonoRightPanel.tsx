import { Link } from "react-router-dom"
import TextView from "./TextView"
import { TonoDef } from "./utils"


function TonoRightPanel  ({ panel, tono, maxHeight, onPanelClose }: { panel: string, tono: TonoDef, maxHeight: number | undefined, onPanelClose: () => void }) {

    
    if (panel == "")
        return (<></>)


    return (
        <div style={{display: "flex", flexDirection: "column" }}>
            <Link to="#" onClick={onPanelClose} className="small panel-close-button">
                <i className="fa-solid fa-circle-xmark"></i>
            </Link>
            <div style={{
                marginLeft: "4px",
                width: "20vw",
                height: maxHeight != null ? `${maxHeight}px` : "100%",
                overflowY: "scroll"}}>
                <TextView tono={tono} />
            </div>
        </div>
    )
}

export default TonoRightPanel