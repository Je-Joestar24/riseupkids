import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Name of the shared library file a module belongs to, or undefined to let the bundler decide.
 * Exported for the tests.
 */
export const manualChunkFor = (id) => {
  if (!id.includes('node_modules')) return undefined;
  if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) {
    return 'vendor-react';
  }
  if (/node_modules\/(@reduxjs\/toolkit|react-redux|redux|redux-thunk|immer|reselect|use-sync-external-store)\//.test(id)) {
    return 'vendor-state';
  }
  return undefined;
};

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
      rollupOptions: {
        output: {
          // Libraries every visitor needs and that rarely change get their own files, so after a
          // release a returning visitor re-downloads only the app's own code, not React again.
          // Libraries only some areas use (drag-and-drop, payments, icons, most of the UI kit)
          // are left to the page chunks that need them.
          manualChunks: (id) => manualChunkFor(id),
        },
      },
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

