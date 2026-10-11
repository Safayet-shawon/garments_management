import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CDN_URL (optional): serve the fingerprinted JS/CSS from a CDN origin, e.g. CDN_URL=https://cdn.winnerapparels.com/
export default defineConfig({
  base: process.env.CDN_URL || '/',
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: `http://localhost:${process.env.PORT ?? 8080}`, changeOrigin: false } } },
  build: {
    target: 'es2020',
    sourcemap: false,
    cssMinify: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // stable vendor chunks cache across deployments; page code splits automatically through React.lazy
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/node_modules\/(react-router|react-router-dom|@remix-run)/.test(id)) return 'router'
          if (/node_modules\/(recharts|d3-|victory-vendor|decimal\.js-light|internmap|immer|redux|@reduxjs|reselect)/.test(id)) return 'charts'
          if (/node_modules\/lucide-react/.test(id)) return 'icons'
          return undefined
        },
      },
    },
  },
})
