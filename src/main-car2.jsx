import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppCar2 from './AppCar2'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppCar2 />
  </StrictMode>,
)
