import { createBrowserRouter, createRoutesFromElements,  Route, RouterProvider } from 'react-router-dom';
import About from './About';
import './App.css'
import BaseLayout from './BaseLayout';
import Tono from './Tono';
import Tonos from './Tonos';
import PageTitle from './PageTitle';
import '@ant-design/v5-patch-for-react-19';
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
  <PageTitle title="Cancionero de Miranda: tonos" />
  <Tonos />
  </>
)

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<BaseLayout />}  /*ErrorBoundary={ErrorChecker}*/ >
      <Route index element={about} />
      <Route path='tonos' element={tonos} />
      <Route path='tono/:tonoNumber' element={ <Tono/>} />
      <Route path='about' element={about} />
      <Route path='progreso' element={<Dashboard />} />

  </Route>
  )
)



function App() {

  return (
      <RouterProvider router={router} />
  )
}

export default App;
