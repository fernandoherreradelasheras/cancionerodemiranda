import { NavLink } from "react-router-dom"
import { Image } from 'antd';

const REPO_URL = "https://github.com/fernandoherreradelasheras/cancionerodemiranda"

const About = () => (
    <section className="about">
        <header className="main">
            <h2>Acerca del proyecto</h2>
        </header>
        <Image width="60%" src="/header1.jpg" preview={false}></Image>
        <div style={{width: "75%"}} className="about-text">

        <p>Esta es la web del proyecto de edición del Cancionero de Miranda. El
            estudio, redacción, transcripción y reconstrucción de este cancionero se está
            realizando en abierto en el repositorio público del proyecto <a href={REPO_URL}>{REPO_URL}</a>.</p>

        <p>Para la edición del cancionero estamos utilizando y desarrollando diferentes herramientas con el fin de ofrecer
        una edición multimodal en papel y digital. El objetivo principal es que todo el mundo pueda disfrutar de la música
        y el texto de la forma que mejor se adapte a sus circustancias, ya sean intérpretes, invetigadores, musicólogos
        o simplemente aficionados a la música antigua.</p>

        <p>Así, un musicólogo puede estar muy interesado en ver las correcciones y cambios frente al manuscrito de manera cómoda
            sin tener que estar yendo y viniendo de las notas editoriales mientras que a un cantante le puede interesar más tener
            el texto completo bajo la música. Todo esto se refleja en el visor de partituras digitales desarrollado para el proyecto,
            que permite elegir el número de versos a mostar, las correcciones y notas editoriales in situ o incluso deshacer los cambios
            de clave y transposiciones, algo útil para los transcriptores.</p>


        <p>Otra novedad interesante es el uso de un reproductor de audio con interpretaciones de los tonos mediante
            software. Estas versiones hacen uso de cantantes virtuales y solo facilitan el trabajo de edición en temas
            como el ajuste silábico, sino que también pueden servir como una primera aproximación a la música cantada. El
            reproductor, además de mostrar las notas que están sonando en cada momento tiene un modo inmersivo que muestra
            la partitura con una animación de sroll infinito.</p>

        <p>Para la reconstrucción de la voz perdida de alto, además del trabajo tradicional de recomposición, en el que están colaborando
            diversos musicólogos, se está experimentando con el uso de diferentes modelos de intelegencia artifical.
            La tarea de completar una voz que se ha de ceñir a unas reglas específicas a la vez considerar casos fuera de las
            pautas establecidas es un interesante reto para estas tecnologías. Las primeras de estas reconsutrucciones se pueden ya activar
            en el visor de partituras e incluyen una pista de audio propia para escuchar el resultado completo. Aunque algunas presentan muchos
            errores es un ejercicio interesante observar y comparar los resultados de unos y otros modelos.</p>

        <p>El <NavLink to="/tonos">listado de tonos</NavLink>, accesible también desde el menú la
        barra superior, muestra el estado de cada uno de los tonos y permite acceder
        a textos y partituras, e imágenes de los manuscritos. Además se incluye una versión imprimible
        de todo el contenido, similar en aspecto al de una posible edición en papel.</p>
        </div>

    </section>
)


export default About;
