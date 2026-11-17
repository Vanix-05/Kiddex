import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the frontend calls /api/... on its own address and Vite passes it
    // on to the backend, so there is no CORS trouble. Start the backend with `npm run dev`.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
