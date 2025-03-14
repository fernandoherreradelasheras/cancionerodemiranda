import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, theme } from "antd";




function SimpleIconButton({ icon, onClick }: { icon: IconDefinition, onClick: () => void }) {
    const {
        token: { colorPrimary },
      } = theme.useToken();

    return (
        <Button
            onClick={onClick}>
            <FontAwesomeIcon
                color={colorPrimary}
                icon={icon}
                size="sm" />
        </Button>
    )
}

export default SimpleIconButton