import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider, useParams } from 'react-router-dom';
import { pathOfTono } from './utils';
import About from './About';
import './App.css'
import BaseLayout from './BaseLayout';
import Tono from './Tono';
import Tonos from './Tonos';
import PageTitle from './PageTitle';
import Dashboard from './Dashboard';


/*
function ErrorChecker() {

  const error = useRouteError()

  if (isRouteErrorResponse(error)) {
    return (
      <p>Error checker result: {`${JSON.stringify(error)}`}</p>
    )
  }
}
  */

const about = (
  <>
  <PageTitle title="Acerca del Cancionero de Miranda" />
  <About />
  </>
)

const tonos = (
  <>
  <PageTitle title="Tonos · Cancionero de Miranda" />
  <Tonos />
  </>
)

// The pages used to live at /tono/<number>/ (see tonoPath.js). The deploy turns those into
// redirects, so this only catches in-app navigation to an old path
const LegacyTono = () => {
  const { tonoNumber } = useParams()
  return <Navigate to={pathOfTono(parseInt(tonoNumber ?? ""))} replace />
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<BaseLayout />}  /*ErrorBoundary={ErrorChecker}*/ >
      <Route index element={about} />
      <Route path='tonos/' element={tonos} />
      <Route path='tono/:tonoNumber/:slug/' element={ <Tono/>} />
      <Route path='tono/:tonoNumber/' element={ <LegacyTono/>} />
      <Route path='about/' element={about} />
      <Route path='progreso/' element={<Dashboard />} />

  </Route>
  )
)



function App() {

  return (
      <RouterProvider router={router} />
  )
}

export default App;
