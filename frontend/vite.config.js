import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/html5': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Ensure proper asset handling
    assetsDir: 'assets',
    // Generate source maps for debugging (optional, remove in production)
    sourcemap: false,
  },
  // Preview server for testing production build
  preview: {
    port: 3000,
    open: true,
  },
});

