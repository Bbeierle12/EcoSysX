import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Use the full ecosystem simulator
import App from './EcosystemSimulator.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
