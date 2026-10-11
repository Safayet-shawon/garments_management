import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()], define: { 'import.meta.env.VITE_MEMORY': 'true', 'process.env.NODE_ENV': '"production"' },
  build: { assetsInlineLimit: 1000000, outDir: 'dist-artifact', cssCodeSplit: false, lib: { entry: 'src/main.tsx', formats: ['iife'], name: 'App', fileName: () => 'app.js' }, rollupOptions: { output: { inlineDynamicImports: true, assetFileNames: 'app.[ext]' } } },
})
