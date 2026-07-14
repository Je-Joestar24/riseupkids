import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = parseInt(env.VITE_DEV_SERVER_PORT || '3000', 10);
  const apiUrl = env.VITE_API_URL || 'http://localhost:5000';
  const proxyTarget = apiUrl.replace(/\/api\/?$/, '').replace(/\/+$/, '') || apiUrl;

  return {
    plugins: [react()],
    server: {
      port: devPort,
      open: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          timeout: 7200000,
          proxyTimeout: 7200000,
        },
        '/uploads': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/html5': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    build: {
      assetsDir: 'assets',
      sourcemap: false,
    },
    preview: {
      port: devPort,
      open: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
    },
  };
});

