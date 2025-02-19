

export const SVG_STYLE_RULES = [1, 2, 3, 4, 5].map(i=> `.staff[data-n="${i}"] { --high: url(#highlighting-${i}); }`).join('\n') 



const svgFilter = (id: string, color: string) =>
    <filter id={`highlighting-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feFlood floodColor={color} result="base">
        </feFlood>
        <feGaussianBlur in="SourceAlpha" result="blur-out" stdDeviation="50" />
        <feOffset in="blur-out" result="the-shadow" />
        <feComposite result="drop" in="base" in2="color-out" operator="in" />
        <feBlend in="SourceGraphic" in2="drop" mode="normal" />
    </filter>


export const SVG_FILTERS = 
<svg xmlns="http://www.w3.org/2000/svg" overflow="visible" style={{height:"0%", width:"0%"}}>
    <defs>
        {svgFilter("1", "#8e0000")}
        {svgFilter("2", "#00ff00")}
        {svgFilter("3", "#225c5c")}
        {svgFilter("4", "#e9227a")}
        {svgFilter("4", "#fa8072")}
        {svgFilter("5", "#11ddff")}
    </defs>
</svg>