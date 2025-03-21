

const staffHighlightColors = ["#8e0000", "#227710", "#5500aa", "#e9227a", "#fa8072", "#11ddff",]

export const SVG_STYLE_RULES = [1, 2, 3, 4, 5].map(i=> `.staff[data-n="${i}"] { \
    --high: url(#highlighting-${i}); \
    --hgcolor: ${staffHighlightColors[i-1]} }`).join('\n')



const svgFilter = (id: string, color: string) =>
    <filter id={`highlighting-${id}`} x="-100%" y="-100%" width="300%" height="300%">
        <feMorphology id={`radius-${id}`} in="SourceAlpha" operator="dilate" radius="200" result="expanded"/>

        <feFlood floodColor={color} floodOpacity="0.6" result="color"/>
        <feComposite in="color" in2="expanded" operator="in" result="colored-background"/>
        <feComposite in="SourceGraphic" in2="colored-background" operator="over"/>

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
     <animate id="radius-1-animation" xlinkHref="#radius-1" attributeName="radius" from="10" to="200" dur="2s" begin="0s" fill="freeze" repeatCount="indefinite" restart="always"/>
     <animate id="radius-2-animation" xlinkHref="#radius-2" attributeName="radius" from="10" to="200" dur="2s" begin="0s" fill="freeze" repeatCount="indefinite" restart="always"/>
     <animate id="radius-3-animation" xlinkHref="#radius-3" attributeName="radius" from="10" to="200" dur="2s" begin="0s" fill="freeze" repeatCount="indefinite" restart="always"/>
     <animate id="radius-4-animation" xlinkHref="#radius-4" attributeName="radius" from="10" to="200" dur="2s" begin="0s" fill="freeze" repeatCount="indefinite" restart="always"/>
     <animate id="radius-5-animation" xlinkHref="#radius-5" attributeName="radius" from="10" to="200" dur="2s" begin="0s" fill="freeze" repeatCount="indefinite" restart="always"/>
</svg>