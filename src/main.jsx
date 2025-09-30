import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Use the simple test app first to verify core functionality
import App from './SimpleTestApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
