import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// VITE_BASE is "/musercise/" on GitHub Pages (project sites live under the repo name).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  // The commit GitHub Actions builds from, shown in Settings so you can tell a new version has arrived.
  define: { __BUILD__: JSON.stringify((process.env.GITHUB_SHA ?? 'local').slice(0, 7)) },
  test: { environment: 'node' },
})
