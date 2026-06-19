import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppPickem from './AppPickem'

createRoot(document.getElementById('root')).render(
  <StrictMode><AppPickem /></StrictMode>
)
