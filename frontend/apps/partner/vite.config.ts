import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@netlayer/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@netlayer/api': path.resolve(__dirname, '../../packages/api/src'),
      '@netlayer/auth': path.resolve(__dirname, '../../packages/auth/src'),
    },
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
