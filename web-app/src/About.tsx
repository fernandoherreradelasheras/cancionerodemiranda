import { NavLink } from "react-router-dom"
import { Image } from 'antd';

const REPO_URL = "https://github.com/fernandoherreradelasheras/cancionerodemiranda"

const About = () => (
    <section className="about">
        <header className="main">
            <h2>Acerca del proyecto</h2>
        </header>
        <Image width="70%" src="/header1.jpg" preview={false}></Image>

        <p>Estamos trabajando en la edición del Cancionero de Miranda. Todo el trabajo de
            estudio, redacción, transcripción y reconstrucción se está realizando en abierto
            en el repositorio público del proyecto <a href={REPO_URL}>{REPO_URL}</a>.</p>

        <p>En este proyecto se están utilizando herramientas novedosas para poder ofrecer una edición
        multimodal en papel y digital que permita disfrutar de la música y el texto de la forma que mejor
        se adapte a cada usuario ya sean intérpretes, invetigadores, musicólogos o simplemente aficionados
        a la música antigua.</p>

        <p>La visualización de las partituras digitales permite configurar varios aspectos como las transposiciones
            de claves altas, modernización de las claves, normalización de música ficta, configuración del número de versos a
            mostrar, etc.</p>

        <p>Otra novedad interesante es el uso de un reproductor de audio con interpretaciones de los tonos realizadas
            por software. Estas versiones realizadas con cantantes virtuales no solo facilita el trabajo de edición en temas
            como el ajuste silábico sino que también pueden servir como una primera aproximación a la música cantada. Este
            reproductor, además de mostrar las notas que están sonando en cada momento tiene un modo inmersivo que muestra
            la partitura con una animación de sroll infinito.</p>

        <p>Para la reconstrucción de la voz perdida de alto, además del trabajo tradicional de recomposición, en el que están colaborando
            diversos musicólogos, se está experimentando con el uso de diferentes modelos de intelegencia artifical.
            La tarea de completar una voz que se ha de ceñir a unas reglas específicas pero a la vez considerar casos fuera de las
            pautas establecidas es un interesante retos para estas tecnologías. Varias de estas reconsutrucciones están ya disponibles, incluyendo
            el audio resultante de mezclar las diversas opciones.</p>

        <p>El <NavLink to="/tonos">listado de tonos</NavLink>, accesible también desde el menú la
        barra superior, muestra el estado de cada uno de los tonos y permite acceder
        a textos y partituras, e imágenes de los manuscritos. Además se incluye una versión imprimible
        de todo el contenido, similar en aspecto al de una posible edición en papel.</p>
    </section>
)


export default About;
