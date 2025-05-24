import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@ant-design/v5-patch-for-react-19';
import 'react-tooltip/dist/react-tooltip.css'
import './index.css'
import 'score-viewer/style.css'

import App from './App.tsx'



createRoot(document.getElementById('root')!).render(
  <StrictMode>
      <App />
  </StrictMode>
)
