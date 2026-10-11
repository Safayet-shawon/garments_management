import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter/wght.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-700.css'
import './index.css'
import './buttons.css'
import App from './App'

if (!document.documentElement.getAttribute('data-btn')) document.documentElement.setAttribute('data-btn', 'clay')

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
