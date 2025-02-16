import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, createRoutesFromElements,RouterProvider, Route } from 'react-router-dom'
import About from './About.tsx'
import BaseLayout from './BaseLayout.tsx'
import Tonos from './Tonos.tsx'
import Tono from './Tono.tsx'


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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
