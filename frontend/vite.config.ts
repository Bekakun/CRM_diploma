import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      allowedHosts: ['crm-platform.ngrok.app'],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/ws': {
          target: backendUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      // Split vendor libraries into separate cached chunks
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui':     ['lucide-react'],
            'vendor-i18n':   ['react-i18next', 'i18next'],
            'vendor-chart':  ['recharts'],
            'vendor-misc':   ['axios', 'zustand', 'date-fns'],
          },
        },
      },
      // Increase chunk warning threshold
      chunkSizeWarningLimit: 600,
    },
  }
})
