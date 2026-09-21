import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import 'score-viewer/style.css'
import './index.css'

import App from './App.tsx'



/* The prerendered block stays for crawlers, except on the pages whose own view provides the
   heading and the content: there it would duplicate the <h1> (see prerender.mjs) */
document.querySelector('#static-content[data-transient]')?.remove()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
