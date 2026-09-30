import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// VITE_BASE is "/musercise/" on GitHub Pages (project sites live under the repo name).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'node' },
})
