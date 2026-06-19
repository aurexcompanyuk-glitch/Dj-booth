import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        cinematic: 'cinematic.html',
        car: 'car.html',
        car2: 'car2.html',
        car3: 'car3.html',
        pickem: 'pickem.html',
        saas: 'saas.html',
        portfolio: 'portfolio.html',
        pricing: 'pricing.html',
      }
    }
  }
})
