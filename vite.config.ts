import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import lookupHandler from './api/bhxh-lookup.ts'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'bhxh-lookup-api',
      configureServer(server) {
        const secret = loadEnv(mode, process.cwd(), 'BHXH_LOOKUP_').BHXH_LOOKUP_SESSION_SECRET || '';
        server.middlewares.use('/api/bhxh-lookup', (req, res) => { void lookupHandler(req, res, secret); });
      },
    },
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
}))
