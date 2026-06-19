import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppCar from './AppCar'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppCar />
  </StrictMode>,
)
