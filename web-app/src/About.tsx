import { NavLink } from "react-router-dom";

const REPO_URL = "https://github.com/fernandoherreradelasheras/cancionerodemiranda"

const About = () => (
    <section className="about">
        <header className="main">
            <h1>Acerca del proyecto</h1>
        </header>

        <span className="image main"><img src="header1.jpg" alt="" /></span>
        <p>Estamos trabajando en la edición del Cancionero de Miranda. Esta edición, al incluir
            la reconstrucción de la voz perdida del alto, require un trabajo superior al habitual.
            Todo este trabajo de transcripción, reconstrucción y edición se está realizando en el
            repositorio público del proyecto <a href={REPO_URL}>{REPO_URL}</a>.</p>

        <p>Hasta que la edición esté lista, esta web permite consultar el progreso de cada uno de
            los tonos que componen el cancionero, así como ver las versiones <b>de trabajo</b>
            de los textos y partituras correspondientes. En muchos casos, el visor de la partituras
            permite también reproducir una interpretación generada por software con el fin de facilitar
            el trabajo de ajuste silábico. Estas interpretaciones por software a veces usan una afinación
            inferior a los 415Hz o 392Hz habituales para adaptarse mejor a los rangos óptimos de los bancos
            de voces utilizados.</p>

        <p>El <NavLink to="/tonos">listado de tonos</NavLink>, accesible también desde el menú la
        barra lateral de la izquierda, muestra el estado de cada uno de los tonos y permite acceder
        a textos y partituras, e imágenes de los manuscritos. Además se incluye una versión imprimible
        de todo el contenido, similar en aspecto al de una posible edición en papel.</p>
    </section>
)


export default About;
