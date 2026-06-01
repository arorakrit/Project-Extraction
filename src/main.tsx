import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/App'
import '../style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Could not find #root element in index.html')

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
