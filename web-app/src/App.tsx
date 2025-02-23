import { createBrowserRouter, createRoutesFromElements, Route, RouterProvider } from 'react-router-dom';
import About from './About';
import './App.css'
import BaseLayout from './BaseLayout';
import Tono from './Tono';
import Tonos from './Tonos';


const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path='/' element={<BaseLayout />}>
      <Route index element={<About />} />
      <Route path='tonos' element={<Tonos />} />
      <Route path='tono/:tonoNumber' element={<Tono />} />
      <Route path='about' element={<About />} />
    </Route>

  )
)



function App() {


  return (    
      <RouterProvider router={router} />    
  )
}

export default App;
