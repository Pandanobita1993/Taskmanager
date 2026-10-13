import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // Listen on all local IPs
  },
  resolve: {
    alias: {
      // Force all imports of 'xlsx' to use xlsx-js-style (which supports cell styling)
      'xlsx': 'xlsx-js-style',
    },
  },
})
