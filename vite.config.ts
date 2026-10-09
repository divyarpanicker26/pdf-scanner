import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Relative asset paths so the production build works on GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? './' : '/',
  plugins: [react()],
}))
