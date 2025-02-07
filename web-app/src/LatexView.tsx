import { addMeasureHoversForLatex } from "./hooks"


function unTexLine(line: string) {
    if (line == "") {
        return "<br/>"
    } else {
        line = line.replace(/\\section\*{([^}]+)}/g, "<h2>$1</h2>")
        line = line.replace(/\\subsection\*{([^}]+)}/g, "<h3>$1</h3>")
        line = line.replace(/\\textbf{([^}]+)}/g, "<strong>$1</strong>")
        line = line.replace(/\\textit{([^}]+)}/g, "<em>$1</em>")
        line = line.replace(/\\url{([^}]+)}/g, "<a href=\"$1\">$1</a>")
        line = line.replace(/\\item/g, "")
        line = line.replace(/\\tightlist/g, "")           
        line = line.replace(/\\todo{([^}]+)}/g, "<span style=\"background-color:#ffd58b;\">TODO: $1</span>")
        line = line.replace(/\\textsuperscript{([^}]+)}/g, "$1")
        line = line.replace(/\\\\/g, "")
        line = line.replace(/\$\\[a-z]*\$/g, "")

        line = line.replace(/\\noindent/g, "")
        line += "<br/>"

        return line;
    }
}



function unTextGroups(text: string) {
    text = text.replace(/\\begin{verse}([^}]*)\\end{verse}/g, "<em>$1</em>")
    text = text.replace(/\\begingroup/g,"")
    text = text.replace(/\\endgroup/g,"")
    text = text.replace(/\\begin{itemize}\n/g, "")
    text = text.replace(/\\end{itemize}\n/g, "")
    text = text.replace(/\\centering/g,"")
    text = text.replace(/\\itshape/g,"")
    text = text.replace(/\n{3,}/g, "\n")

    return text
}



function getLatexP(text: string) {
    return ( 
         <p dangerouslySetInnerHTML={{ __html: text }} />
    )
}


function LatexView({ text }: { text: string | null }) {

    if (text != null) {
        var htmlText = ""
        text = unTextGroups(text)
        for (const line of text.split('\n')) {
            htmlText += unTexLine(line)
        }
        htmlText = addMeasureHoversForLatex(htmlText)

        return (
            <div>
               {getLatexP(htmlText)}
            </div>
        )
    } else {
        return null
    }
}

export default LatexView