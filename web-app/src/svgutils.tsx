

const staffHighlightColors = ["#8e0000", "#227710", "#5500aa", "#e9227a", "#fa8072", "#11ddff",]

export const SVG_STYLE_RULES = [1, 2, 3, 4, 5].map(i=> `.staff[data-n="${i}"] { --high: url(#highlighting-${i}); --hgcolor: ${staffHighlightColors[i-1]} }`).join('\n') 



const svgFilter = (id: string, color: string) =>
    <filter id={`highlighting-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feFlood floodColor={color} result="base">
        </feFlood>
        <feGaussianBlur in="SourceAlpha" result="blur-out" stdDeviation="50" />
        <feOffset in="blur-out" result="the-shadow" />
        <feColorMatrix in="the-shadow" result="color-out" type="matrix"
            values="0 0 0 0   0
            0 0 0 0   0
            0 0 0 0   0
            0 0 0 2.0 0"/>
        <feComposite result="drop" in="base" in2="color-out" operator="in" />
        <feBlend in="SourceGraphic" in2="drop" mode="normal" />
    </filter>



export const SVG_FILTERS = 
<svg xmlns="http://www.w3.org/2000/svg" overflow="visible" style={{height:"0%", width:"0%"}}>
    <defs>
        {svgFilter("1", staffHighlightColors[0])}
        {svgFilter("2", staffHighlightColors[1])}
        {svgFilter("3", staffHighlightColors[2])}
        {svgFilter("4", staffHighlightColors[3])}
        {svgFilter("5", staffHighlightColors[4])}    
    </defs>
</svg>