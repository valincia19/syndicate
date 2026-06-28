import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/geist'
import '@fontsource-variable/eb-garamond'
import '@fontsource/instrument-serif'
import '@fontsource-variable/geist-mono'
import './index.css'
import App from './App.jsx'

;(function initTheme() {
  const theme = localStorage.getItem('theme') || 'system'
  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', isDark)
})()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
