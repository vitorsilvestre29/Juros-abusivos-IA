import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  ssgOptions: {
    // Rotas autenticadas/dinamicas nao sao pre-renderizadas (continuam client-side-only).
    // O filtro padrao ja remove rotas dinamicas (":contractId"/":analysisId"); aqui so
    // removemos "/app" (privada) e o catch-all "*", que nao fazem sentido como HTML estatico.
    includedRoutes(paths) {
      return paths.filter(path => {
        const normalized = path.replace(/^\/+/, '')
        return normalized !== 'app' && normalized !== '*'
      })
    },
  },
})
