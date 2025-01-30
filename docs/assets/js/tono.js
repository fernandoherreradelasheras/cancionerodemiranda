

import 'https://editor.verovio.org/javascript/app/verovio-app.js';


const repoRoot = "https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda/main/";


const options = {
    defaultView: 'responsive',
    responsiveZoom: 3,
    enableDocument: true,
}

//const botonesIds = [ "boton-intro", "boton-texto", "boton-musica", "boton-comentarios-texto", "boton-comentarios-musica" ];

const TEXT_TRANSCRIPTION = 'text_transcription';

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const definitionPath = urlParams.get('path');
const tonoIdx = parseInt(definitionPath.substring(0, 2)) - 1;
const dir = definitionPath.substring(0, definitionPath.lastIndexOf("/"));


var verovioApp = null;
var textLoaded = false;
var comentariosTextoLoaded = false;
var comentariosMusicaLoaded = false;
var introLoaded = false;
var currentFacsimilImageIdx = -1;




function appendStatusElement(ul, tono, label, key) {
    let li = document.createElement("li");
    let value = tono[key];
    let text = document.createTextNode(`${label}:`);
    li.appendChild(text);
    let span = document.createElement("span");
    switch (value) {
        case "not started":
            span.classList.add("text-not-started");
            break;
        case "completed":
            span.classList.add("text-completed");
            break;
        case "in progress":
            span.classList.add("text-in-progress");
            break;
    }
    text = document.createTextNode(`${value}`);
    span.appendChild(text);
    li.appendChild(span);

    ul.appendChild(li);
}

function statusStarted(status) {
    return (status == "in progress" || status == "completed");
}

function tonoHasIntro(tono) {
    return (tono['introduction'] != undefined && tono['introduction'] != '');
}

function tonoHasText(tono) {
    return (statusStarted(tono['status_text_transcription']) &&
        tono[TEXT_TRANSCRIPTION] != undefined && tono[TEXT_TRANSCRIPTION] != '')
}
function tonoHasTextComments(tono) {
    return (tono['text_comments_file'] != undefined && tono['text_comments_file'] != '');
}

function tonoHasMusic(tono) {
    return (statusStarted(tono['status_music_transcription']) && tono['mei_file'] != undefined && tono['mei_file'] != '');
}


function tonoHasMusicComments(tono) {
    return (tono['music_comments_file'] != undefined && tono['music_comments_file'] != '');
}

const zeroPad = (num, places) => String(num).padStart(places, '0');




function updateCurrentTono(tono) {
    document.getElementById("tono-titulo").innerHTML = tono["title"];
    document.getElementById("tono-autor-musica").innerHTML = "Música: " + tono["music_author"];
    document.getElementById("tono-autor-texto").innerHTML = "Texto: " + tono["text_author"];
    let ul = document.getElementById("tono-estado-texto");
    appendStatusElement(ul, tono, "Transcripción del texto", "status_text_transcription");
    appendStatusElement(ul, tono, "Revisión del texto", "status_text_proof_reading");
    appendStatusElement(ul, tono, "Validación del texto", "status_text_validation");
    ul = document.getElementById("tono-estado-musica");
    appendStatusElement(ul, tono, "Transcripción musical", "status_music_transcription");
    appendStatusElement(ul, tono, "Revisión de la transcripción musical", "status_music_proof_reading");
    appendStatusElement(ul, tono, "Validación de la transcripción musical", "status_music_validation");
    //appendStatusElement(ul, tono, "Estudio poético", "status_poetic_study");
    //appendStatusElement(ul, tono, "Estudio musical", "status_musical_study");

    if (!tonoHasIntro(tono)) {
        document.getElementById("boton-intro").style.display = "none";
    }

    if (!tonoHasText(tono)) {
        document.getElementById("boton-texto").style.display = "none";
    }

    if (!tonoHasTextComments(tono)) {
        document.getElementById("boton-comentarios-texto").style.display = "none";
    }

    if (!tonoHasMusic(tono)) {
        document.getElementById("boton-musica").style.display = "none";
    }

    if (!tonoHasMusicComments(tono)) {
        document.getElementById("boton-comentarios-musica").style.display = "none";
    }



    document.getElementById("tono-informacion").style.visibility = 'visible';
}


function appendTonoText(parent, type, text) {
    let p = document.createElement("p");
    p.classList.add("poetry");
    if (type == "coplas" || type == "estribillo")  {
        let span = document.createElement("span");
        span.classList.add("poem-type");
        let text = document.createTextNode(type.charAt(0).toUpperCase() + type.slice(1));
        span.appendChild(text);
        p.appendChild(span);
        let br = document.createElement("br");
        p.appendChild(br);
    }

    for (let line of text.split('\n')) {
        let em = document.createElement("em");
        let text = document.createTextNode(line);
        em.appendChild(text);
        p.appendChild(em);
        let br = document.createElement("br");
        p.appendChild(br);
    }
    parent.appendChild(p);
}

async function getTonoData(path) {
    const fileUrl = encodeURI(repoRoot + 'tonos/' + path);
    return fetch(fileUrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            return json
        });
}

function unTex(line) {
   
    line = line.replaceAll( /\\subsection\*{([^}]+)}/g, "<br/><h3>$1</h3>");
    line = line.replaceAll( /\\textbf{([^}]+)}/g, "<strong>$1</strong>");
    line = line.replaceAll( /\\textit{([^}]+)}/g, "<em>$1</em>");
    line = line.replaceAll( /\\\\/g, "<br/>");
    line = line.replaceAll( /\\noindent/g, "");

    return line;
}

async function populateLatex(parent, path) {
    let url = repoRoot + "tonos/" + dir + "/" + path;
    let text = await fetch(url).then(function (response) {
        return response.text();
    });

    let p = document.createElement("p");

    var html = "";
    for (let line of text.split('\n')) {
        html += unTex(line);
    }
    p.innerHTML = html;        
    parent.appendChild(p);
}






$( document ).ready(async function() {		    
    

    const pdfs = await fetch("./pdfs-release-v0.0.2.json")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            return json
        });

   
    const data = await getTonoData(definitionPath);
    updateCurrentTono(data);
    const imgsUrls = [
        ...data['s1_pages'].map(p => `${repoRoot}facsimil-images/S1/image-${zeroPad(p, 3)}.jpg`),
        ...data['s2_pages'].map(p => `${repoRoot}facsimil-images/S2/image-${zeroPad(p, 3)}.jpg`),
        ...data['t_pages'].map(p => `${repoRoot}facsimil-images/T/image-${zeroPad(p, 3)}.jpg`),
        ...data['g_pages'].map(p => `${repoRoot}facsimil-images/G/image-${zeroPad(p, 3)}.jpg`)];
    const imgsLabels = [
        ...data['s1_pages'].map(p => `Tiple 1º p. ${p}`),
        ...data['s2_pages'].map(p => `Tiple 2º p. ${p}`),
        ...data['t_pages'].map(p => `Tenor p. ${p}`),
        ...data['g_pages'].map(p => `Guion p. ${p}`)];

    function setPage(idx) {
            currentFacsimilImageIdx = idx;
        
            document.querySelectorAll("span.page").forEach(p => p.classList.remove("active"));
            const sel = `span.page[data-pageidx="${idx + 1}"]`;
            console.log(sel);
            document.querySelector(sel).classList.add("active");
            
            document.getElementById("facsimil-title").innerHTML = imgsLabels[idx];

            const img = document.getElementById("facsimil-img");
            img.src = imgsUrls[idx]
            if (idx < imgsUrls.length - 1) {
                document.getElementById("page-next-button").classList.remove("disabled");
            } else {
                document.getElementById("page-next-button").classList.add("disabled");
        
            }
            if (idx > 0) {
                document.getElementById("page-prev-button").classList.remove("disabled");
            } else {
                document.getElementById("page-prev-button").classList.add("disabled");
            }
    }




    $(".tono-action").on("click", function() {
        let clickedId = this.id;
        let targetId = this.dataset.target;
        $(".tono-action").each(function( index ) {
            if (this.id != clickedId) {
                this.classList.remove("disabled");
            } else {
                this.classList.add("disabled");
            }
        });

        $(".tono-display").each(function( index ) {
            if (this.id != targetId) {
                this.style.display = "none";
            } else {
                this.style.display = "block";
            }
        });
    });


    


    $("#boton-musica").on( "click", function() {
        let verovioDiv = document.getElementById("verovio-app");
        verovioDiv.parentElement.style.visibility = 'visible';        

        if (verovioApp == null) { 
            let meiUrl = repoRoot + "tonos/" + dir + "/" + data["mei_file"];

            let vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            let offsetTop = verovioDiv.parentElement.offsetTop;
            verovioDiv.style.height = `${vh - offsetTop - 20}px`;
            setTimeout(function() {
                verovioApp = new Verovio.App(verovioDiv, options);

                fetch(meiUrl)
                .then(function (response) {
                    return response.text();
                })
                .then(function (text) {
                    verovioApp.loadData(text, data["mei_file"]);           
                });
            }, 500);
        }
    });

    $("#boton-texto").on( "click", async function() {
        
        let tonoText = document.getElementById("tono-texto");
        if (!textLoaded) {
            textLoaded = true;
            for (let item of data['text_transcription']) { 
                let textUrl = repoRoot + "tonos/" + dir + "/" + item['file'];
                let type = item['type'];
                let text = await fetch(textUrl).then(function (response) {
                    return response.text();
                });
                appendTonoText(tonoText, type, text);
            }
         }        
    });

    $("#boton-intro").on( "click", async function() {        
        if (!introLoaded) {
            introLoaded = true;
            let intro = document.getElementById("tono-intro");
            populateLatex(intro, data['introduction']);
        }
    });

    $("#boton-comentarios-texto").on( "click", async function() {        
        if (!comentariosTextoLoaded) {
            comentariosTextoLoaded = true;
            let comentariosTexto = document.getElementById("tono-comentarios-texto");
            populateLatex(comentariosTexto, data['text_comments_file']);
        }
    });


    $("#boton-comentarios-musica").on( "click", async function() {        
        if (!comentariosMusicaLoaded) {
            comentariosMusicaLoaded = true;
            let comentariosMusica = document.getElementById("tono-comentarios-musica");
            populateLatex(comentariosMusica, data['music_comments_file']);
        }
    });


    $("#boton-facsimil").on( "click", function() {    
        if (currentFacsimilImageIdx == - 1)  {
            const img = document.getElementById("facsimil-img");
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const offsetTop = img.offsetTop;
            img.style.height = `${vh - offsetTop - 20}px`;
            const size = imgsUrls.length;
            for (let i = 1; i <= 10; i++) {
                const sel = `span.page[data-pageidx="${i}"]`;
                console.log(sel);
                const button = document.querySelector(sel);

                console.log(button);
                if (i < size) {
                    button.addEventListener("click", function() {
                        const page = parseInt(this.dataset.pageidx) - 1;
                        setPage(page);
                    }); 
                } else {
                    button.style.display = "none";
                }
            }
            document.getElementById("page-next-button").addEventListener("click", function() {
                setPage(currentFacsimilImageIdx + 1);
            });
        
            document.getElementById("page-prev-button").addEventListener("click", function() {
                setPage(currentFacsimilImageIdx - 1);
            });

            document.getElementById("facsimil-title").innerHTML = imgsLabels[0];
            img.src = imgsUrls[0];
            currentFacsimilImageIdx = 0;

        }        

    });


    $("#boton-pdf").on( "click", function() {    
            const pdfContainer = document.getElementById("tono-pdf");
            const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
            const offsetTop = pdfContainer.offsetTop;
            pdfContainer.style.height = `${vh - offsetTop - 20}px`;

            const pdfObject = document.getElementById("pdf-object");
            pdfObject.setAttribute("data", pdfs[tonoIdx]);

            const pdfLink = document.getElementById("pdf-link");
            pdfLink.setAttribute("href", pdfs[tonoIdx]);
    });
    


});