import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";


function SimpleIconButton({ icon, onClick }: { icon: IconDefinition, onClick: () => void }) {
    return (
        <a onClick={onClick}>
            <FontAwesomeIcon
                className='clickable-icon reverse-color'
                icon={icon}
                inverse
                border
                size="2xl" />
        </a>
    )
}

export default SimpleIconButton