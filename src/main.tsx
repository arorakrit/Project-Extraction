import React from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted brand faces (bundled — work offline, no CDN). Cup'd brand 004.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/jetbrains-mono'
import { App } from '@/App'
import '../style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Could not find #root element in index.html')

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
