import { NavLink } from "react-router-dom";


const Sidebar = () => {
    return (

        <div className="inner">

            <nav id="menu">
                <header className="major">
                    <h2>Menu</h2>
                </header>
                <ul>
                    <li><NavLink to="/tonos">Tonos</NavLink> </li>
                    <li><NavLink to="/about">About</NavLink> </li>



                    <li><a href="https://github.com/fernandoherreradelasheras/cancionerodemiranda">Repositorio github</a></li>

                </ul>
            </nav>

            <section>
                <header className="major">
                    <h2>Otros proyectos</h2>
                </header>
                <div className="mini-posts">
                    <article>
                        <a href="#" className="image"><img src="/humano-y-divino-logo1.jpg" alt="" /></a>
                        <p>Humano y divino: iniciativa para difundir y promover el patrimonio poético-musical en lengua romance del barroco ibérico y americano.</p>
                    </article>
                </div>
                <ul className="actions">
                    <li><a href="https://humanoydivino.com" className="button">Visitar</a></li>
                </ul>
            </section>


            <footer id="footer">
                <p className="copyright">&copy; Humano y divino. fherrera (at) onirica (dot) com</p>

                <p className="copyright">Design: Plantilla por <a href="https://html5up.net">HTML5 UP</a>.</p>
            </footer>

        </div>


    );
};

export default Sidebar;