import { TonoDef } from "./utils"



function Pdf({ tono } : { tono: TonoDef }) { 

    return (
        <div>
            <h4>Preview de la edición en pdf de este tono</h4>
            <p>Estos pdfs se generan de manera periódica con los contenidos del repositorio y es posible que no refleje los últimos cambios</p>
            <object data={tono.pdf_url} type="application/pdf" style={{ width: "100%", height: "60vh"}}>
                <p>
                    Your browser does not support PDFs.
                    <a href={tono.pdf_url}>Download the PDF</a>
                </p>
            </object>
        </div>
    )
}

export default Pdf