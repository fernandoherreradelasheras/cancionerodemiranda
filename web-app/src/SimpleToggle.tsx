import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {  faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons'
import { library } from '@fortawesome/fontawesome-svg-core'


library.add(faToggleOn, faToggleOff)


function SimpleToggle({ text, toggled, onClick }: { text: string, toggled: boolean, onClick: () => void }) {

    return (
        <div className="verovio-topbar-element toggle-button-element">
            <a className="toggle-button-icon" onClick={onClick}>
                <FontAwesomeIcon
                    className='clickable-icon'
                    icon={['fas', toggled ? 'toggle-on' : 'toggle-off']}
                    size="2xl" />
            </a>
            <span>{text}</span>
        </div>
    )
}

export default SimpleToggle