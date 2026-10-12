import { NavLink } from "react-router-dom"

const REPO_URL = "https://github.com/fernandoherreradelasheras/cancionerodemiranda"
const SCORE_VIEWER_URL = "https://www.npmjs.com/package/score-viewer"
const EDITIO_URL = "https://editio.humanoydivino.com"
const PAPER_URL = "https://doi.org/10.1145/3748336.3748337"
const ARTICLE_URL = "https://hdl.handle.net/10261/339181"
const SITE_URL = "https://cdm.humanoydivino.com"

/* Status of the edition: updated by hand at each milestone */
const STATUS_DATE = "octubre de 2026"

const STATUS: { state: "done" | "in_progress" | "pending", title: string, items: string[] }[] = [
    {
        state: "done", title: "Terminado", items: [
            "Transcripción del texto poético de los 77 tonos.",
            "Transcripción y revisión de la música de 76 tonos.",
            "Reconstrucción y revisión de la voz perdida en los 67 tonos que la necesitan.",
            "Revisión del texto del primer bloque (tonos 1 a 22).",
        ]
    },
    {
        state: "in_progress", title: "En curso", items: [
            "Transcripción musical del tono 71.",
            "Reconstrucción del guion en los tonos que no lo conservan: 6 terminados y 2 en curso, de 30.",
            "Estudios introductorios: 12 terminados y el resto en redacción.",
            "Enlace de la partitura con el facsímil: 3 tonos.",
        ]
    },
    {
        state: "pending", title: "Pendiente", items: [
            "Revisión del texto de los tonos 23 a 77.",
            "Revisión de los guiones reconstruidos.",
            "Revisión musical completa y revisión musical externa.",
        ]
    },
]

const About = () => (
    <section className="about">
        <header className="main">
            <h1>Acerca del proyecto</h1>
        </header>

        <figure className="about-figure">
            <img src="/header1.jpg"
                alt="Comienzo del tono «Un imposible me mata» en el librete del tiple 1º del Cancionero de Miranda" />
            <figcaption>Comienzo del tono <em>Un imposible me mata</em> en el librete del tiple 1º
                (P-Ln M.M. 4802/1).</figcaption>
        </figure>

        <p className="about-lead">Edición crítica en curso del Cancionero de Miranda, una colección
            de tonos humanos reunida en la Capilla Real de Lisboa a finales del siglo XVII.</p>

        <div className="about-body">
            <aside className="about-record" aria-label="Ficha del manuscrito">
                <dl>
                    <dt>Manuscritos</dt>
                    <dd>Tiple 1º: P-Ln M.M. 4802/1</dd>
                    <dd>Tiple 2º: P-Ln M.M. 4802/2</dd>
                    <dd>Alto: perdido</dd>
                    <dd>Tenor: P-Lant PT/TT/MUS/L122</dd>
                    <dd>Guion: P-Ln M.M. 4803</dd>

                    <dt>Contenido</dt>
                    <dd>77 tonos humanos, 76 en castellano y uno en portugués</dd>

                    <dt>Compilador</dt>
                    <dd>Domingos de Miranda da Costa</dd>

                    <dt>Fecha</dt>
                    <dd>Entre 1681 y 1710</dd>

                    <dt>Procedencia</dt>
                    <dd>Convento de Nuestra Señora del Paraíso, Évora</dd>
                </dl>
            </aside>

            <div className="about-main">
                <h2>El Cancionero de Miranda</h2>

                <p>El cancionero reúne 77 tonos humanos, 76 en castellano y uno en portugués,
                    copiados en libretes de partes. Se conservan cuatro, repartidos entre la Biblioteca
                    Nacional de Portugal y el Arquivo Nacional Torre do Tombo; el del alto se ha
                    perdido. Las partes de las dos
                    instituciones se identificaron como un mismo cancionero a partir de sus
                    digitalizaciones.</p>

                <p>Lo compiló Domingos de Miranda da Costa, que firma el manuscrito como capellán
                    cantor de la Capilla Real de Lisboa, en algún momento entre 1681 y 1710. Los libros
                    llegaron a sus bibliotecas actuales tras la extinción, en 1897, del convento de
                    Nuestra Señora del Paraíso de Évora.</p>

                <p>El repertorio se ordena en tres bloques:</p>
                <ol className="about-blocks">
                    <li><span>Tonos 1 a 22</span> veintidós tonos a cuatro sin estribillo;</li>
                    <li><span>Tonos 23 a 62</span> cuarenta tonos a cuatro con estribillo y coplas;</li>
                    <li><span>Tonos 63 a 77</span> quince tonos a tres.</li>
                </ol>

                <p>La gran mayoría no tiene concordancias musicales conocidas, de modo que el
                    cancionero es la única fuente de buena parte de su música, y es además la fuente
                    principal de la obra profana de fray Felipe de la Madre de Dios.</p>

                <h2>La edición</h2>

                <p>Es una edición crítica multimodal, en línea y en papel, pensada para públicos
                    distintos. En la web, cada lector ajusta la presentación de la partitura a lo que
                    busca; en papel, la edición se ofrece en dos variantes, una para musicólogos y otra
                    para intérpretes.</p>

                <p>Cada tono se codifica en MEI con su música, su texto poético y un aparato crítico
                    anclado a la nota o al verso al que se refiere. Las voces perdidas se reconstruyen
                    en el estilo del propio cancionero, y donde el librete del guion no trae
                    acompañamiento se reconstruye también el guion. La edición cuenta con
                    colaboraciones puntuales de Omar Morales Abril, en la transcripción y la
                    reconstrucción del tono 60, y de Juan José Montblanch, en la reconstrucción de los
                    tonos 4, 18, 19 y 64.</p>

                <h3 className="about-sub">En línea</h3>

                <p><strong>El visor de partituras</strong> se configura desde la propia página: cuántas
                    coplas se muestran bajo la música, si las notas críticas aparecen en su lugar, si se
                    deshacen los cambios de clave y las transposiciones, y si la partitura y el facsímil
                    se ven en pestañas o en una vista dividida. Así, el musicólogo puede tener las
                    intervenciones editoriales a la vista y el cantante, el texto completo bajo la
                    música.</p>

                <p>El visor se adapta además al tamaño de la pantalla. En el ordenador o la tableta
                    caben la partitura y el facsímil uno junto al otro; en el teléfono, la partitura se
                    recompone para el ancho disponible y los datos del tono se pliegan para dejarle
                    sitio. En las pantallas táctiles la navegación responde a los gestos, y a pantalla
                    completa la partitura ocupa toda la superficie.</p>

                <figure className="about-devices">
                    <div className="about-devices-row">
                        <img className="tablet" src="/about/visor-tableta-completa.jpg" loading="lazy"
                            alt="El visor a pantalla completa en una tableta en horizontal: dos sistemas del tono 1 con una sola copla" />
                        <img className="phone" src="/about/visor-telefono-vertical.jpg" loading="lazy"
                            alt="El visor en un teléfono en vertical: dos sistemas del tono 1 con una sola copla" />
                    </div>
                    <figcaption>El tono 1 con una sola copla bajo la música, a pantalla completa en una
                        tableta en horizontal y en un teléfono en vertical.</figcaption>
                </figure>

                <p><strong>La introducción y el texto poético</strong> de cada tono tienen sus
                    propias pestañas: el estudio introductorio, por un lado, y el poema editado, con
                    los versos numerados y sus notas, por otro.</p>

                <figure className="about-pair">
                    <div className="about-pair-row">
                        <img className="wide" src="/about/en-linea-introduccion.jpg" loading="lazy"
                            alt="Pestaña de introducción del tono 44, Altiva peña respeitão, en el visor" />
                        <img className="narrow" src="/about/en-linea-texto.jpg" loading="lazy"
                            alt="Pestaña de texto poético del tono 44, con las coplas en portugués y los versos numerados" />
                    </div>
                    <figcaption>Introducción y texto poético del tono 44, <em>Altiva peña
                        respeitão</em>, el único del cancionero en portugués.</figcaption>
                </figure>

                <p><strong>El facsímil enlazado</strong> vincula cada nota de la transcripción con su
                    lugar en el manuscrito. En la vista dividida, Ctrl+clic sobre una nota de la
                    partitura la localiza y la resalta en el facsímil, y Ctrl+clic sobre una nota del
                    facsímil lleva a la transcripción. El enlace está hecho por ahora en tres tonos.</p>

                <figure className="about-shot">
                    <img src="/about/facsimil-enlazado.jpg" loading="lazy"
                        alt="Vista dividida del tono 1: la nota de «ble» del tiple 1º, marcada en la partitura, aparece resaltada en el facsímil del librete" />
                    <figcaption>Tono 1 en vista dividida: la nota pulsada en la partitura (círculo) se
                        resalta en el librete del tiple 1º.</figcaption>
                </figure>

                <p><strong>El audio</strong> ofrece versiones con cantantes virtuales, útiles para
                    revisar el ajuste silábico y como primera aproximación a la música cantada, y
                    reproducción MIDI. El reproductor señala las notas que suenan y tiene un modo
                    inmersivo con la partitura en desplazamiento continuo.</p>

                <h3 className="about-sub">En papel</h3>

                <p>De cada tono hay dos variantes imprimibles, ambas con la introducción, el poema, la
                    partitura y el facsímil. La variante para musicólogos lleva una sola copla bajo la
                    música y marca las intervenciones editoriales con llamadas a las notas críticas, al
                    pie de la página. La variante para intérpretes pone todas las coplas bajo la
                    música, listas para el atril.</p>

                <figure className="about-shot">
                    <img src="/about/variantes-tono06.jpg" loading="lazy"
                        alt="La misma página de música del tono 6 en las dos variantes: a la izquierda, con una copla, llamadas de nota y notas al pie; a la derecha, con todas las coplas bajo la música" />
                    <figcaption>Tono 6, primera página de música: a la izquierda, la variante para
                        musicólogos; a la derecha, la variante para intérpretes.</figcaption>
                </figure>

                <p>En las dos variantes, cada tono se abre con su introducción y su texto poético,
                    antes de la partitura.</p>

                <figure className="about-shot">
                    <img src="/about/papel-introduccion-texto.jpg" loading="lazy"
                        alt="Dos páginas del tono 44 en papel: el comienzo de la introducción y, en la siguiente, su final y el texto poético" />
                    <figcaption>Introducción y texto poético del tono 44 en la versión imprimible para
                        musicólogos.</figcaption>
                </figure>

                <p>Los 77 tonos se reúnen además en tres volúmenes, todavía en preparación: uno para
                    cada variante de la edición y un tercero con los facsímiles de los cuatro
                    libretes.</p>

                <div className="about-books">
                    <img src="/about/libro-critica.jpg" loading="lazy"
                        alt="Cubierta del volumen de la variante para musicólogos" />
                    <img src="/about/libro-interpretes.jpg" loading="lazy"
                        alt="Cubierta del volumen de la variante para intérpretes" />
                    <img src="/about/libro-facsimiles.jpg" loading="lazy"
                        alt="Cubierta del volumen de facsímiles" />
                </div>

                <h3 className="about-sub">Software libre</h3>

                <p>El visor, el facsímil enlazado y el reproductor forman parte de{" "}
                    <a href={SCORE_VIEWER_URL}>score-viewer</a>, software libre con licencia MIT. Se
                    desarrolló para esta edición y se ha convertido en un marco general de edición
                    musical multimodal: cualquier proyecto que codifique su música en MEI puede
                    publicarla con la partitura, el aparato crítico, los facsímiles, los textos y el
                    audio sincronizado. Su diseño y el de esta edición se describen en:</p>

                <p className="about-ref">Fernando Herrera de las Heras, «The Cancionero de Miranda
                    Edition: Leveraging Open Source Technologies for Multi-Modal Music Publication»,
                    en <em>Proceedings of the 12th International Conference on Digital Libraries for
                        Musicology (DLfM 2025)</em>, ACM, 2025.{" "}
                    <a href={PAPER_URL}>doi:10.1145/3748336.3748337</a>.</p>

                <p>Sobre score-viewer funciona también <a href={EDITIO_URL}>Editio</a>, una herramienta
                    que facilita la creación de ediciones en línea mediante un asistente web. A partir
                    de las partituras en MEI o MusicXML, las grabaciones, el facsímil y los textos,
                    Editio genera un sitio web con la partitura interactiva, hecho de ficheros
                    estáticos que pueden publicarse en cualquier servidor.</p>

                <figure className="about-shot">
                    <img src="/about/editio-catalogo.jpg" loading="lazy"
                        alt="Portada de una colección publicada con Editio: la lista de los 24 lieder de Winterreise, con su presentación y un buscador" />
                    <figcaption>Una colección publicada con Editio: <em>Winterreise</em>, de Franz
                        Schubert.</figcaption>
                </figure>

                <h3 className="about-sub">Trabajo en abierto</h3>

                <p>Todo el trabajo de la edición, del estudio a la generación de las versiones en papel,
                    se hace en abierto en el <a href={REPO_URL}>repositorio público del proyecto</a>.</p>

                <h2>Línea de tiempo del proyecto</h2>

                <p>El cancionero se dio a conocer en el artículo que le puso nombre, con su descripción,
                    su contexto, un estudio preliminar de las fuentes poéticas y de los aspectos
                    musicales, las correspondencias con otros cancioneros y una semblanza de los
                    compositores:</p>

                <p className="about-ref">Fernando Herrera de las Heras y Mariano Lambea, «Un
                    cancionero polifónico ibérico inédito», Consejo Superior de Investigaciones
                    Científicas, 2023.{" "}
                    <a href={ARTICLE_URL}>hdl:10261/339181</a>.</p>

                <dl className="about-timeline">
                    <dt>Noviembre de 2023</dt>
                    <dd>Publicación del artículo y apertura del repositorio del proyecto.</dd>

                    <dt>Diciembre de 2023</dt>
                    <dd>Primeras transcripciones en MEI, un primer visor experimental y las primeras
                        versiones en PDF.</dd>

                    <dt>Enero de 2025</dt>
                    <dd>La edición en curso se publica en <a href={SITE_URL}>cdm.humanoydivino.com</a>.</dd>

                    <dt>Febrero de 2025</dt>
                    <dd>Nueva web, con un reproductor de audio que sigue la partitura.</dd>

                    <dt>Marzo de 2025</dt>
                    <dd>Primeras reconstrucciones de la voz de alto.</dd>

                    <dt>Mayo de 2025</dt>
                    <dd>El visor se separa del proyecto como paquete independiente, score-viewer.</dd>

                    <dt>Septiembre de 2025</dt>
                    <dd>Presentación de la edición y de score-viewer en la conferencia DLfM 2025.
                        Reconstruida la voz de alto de los 22 tonos del primer bloque.</dd>

                    <dt>Septiembre de 2026</dt>
                    <dd>Primeras maquetas de los volúmenes en papel: uno por cada variante de la
                        edición y otro de facsímiles.</dd>

                    <dt>Octubre de 2026</dt>
                    <dd>Primeros tonos con el facsímil enlazado nota a nota y revisión del texto del
                        primer bloque.</dd>
                </dl>

                <h2>Estado actual</h2>

                <p className="about-date">Situación en {STATUS_DATE}.</p>

                {STATUS.map(({ state, title, items }) =>
                    <div key={state} className="about-status">
                        <h3><span className={`phase-cell ${state}`} aria-hidden="true" />{title}</h3>
                        <ul>
                            {items.map(item => <li key={item}>{item}</li>)}
                        </ul>
                    </div>)}

                <p className="about-more">
                    <NavLink to="/progreso/">Progreso tono a tono</NavLink>
                    <NavLink to="/tonos/">Listado de tonos</NavLink>
                </p>
            </div>
        </div>
    </section>
)


export default About;
