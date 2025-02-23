import { Link } from "react-router-dom"
import TextView from "./TextView"
import { TonoDef } from "./utils"
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

library.add(faCircleXmark)

function TonoRightPanel  ({ panel, tono, maxHeight, onPanelClose }: { panel: string, tono: TonoDef, maxHeight: number | undefined, onPanelClose: () => void }) {

    
    if (panel == "")
        return (<></>)

    return (
        <div className="right-panel">
            <Link to="#" onClick={onPanelClose} className="small panel-close-button">
                <FontAwesomeIcon className='clickable-icon' icon={faCircleXmark} size="2xl" />
            </Link>
            <div style={{ height: maxHeight != null ? `${maxHeight}px` : "100%" }}>                
                <TextView tono={tono} />
            </div>
        </div>
    )
}

export default TonoRightPanel