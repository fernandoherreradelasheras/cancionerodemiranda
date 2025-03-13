
import { getSvgMidiHighlightStyle } from "./hooks";
import useStore from "./store";
import { SVG_STYLE_RULES } from "./svgutils";


function PlayingNotesStyle() {

    const midiHighlightElements = useStore.use.midiHighlightElements()

    const getStylesForElements = (ids: string[]) => {
        var styles = ""
        ids.forEach(id => {
            styles += getSvgMidiHighlightStyle(id) + "\n"
        });
        return SVG_STYLE_RULES + "\n" +  styles
    }

    return (
        <style dangerouslySetInnerHTML={{ __html: getStylesForElements(midiHighlightElements) }} />


    );
}

export default PlayingNotesStyle;