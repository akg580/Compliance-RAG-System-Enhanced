import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  envPrefix: 'VITE_',

  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom'],
          lucide: ['lucide-react'],
        },
      },
    },
  },

  server: {
    port: 5173,
    // Dev proxy — avoids CORS issues in local development
    proxy: {
      '/api':    { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/readyz': { target: 'http://localhost:8000', changeOrigin: true },
      '/livez':  { target: 'http://localhost:8000', changeOrigin: true },
    },
  },

  preview: { port: 4173 },
}));