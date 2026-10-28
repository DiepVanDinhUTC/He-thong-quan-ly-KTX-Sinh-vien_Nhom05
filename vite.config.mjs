import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const frontendRoot = path.resolve(process.cwd(), 'frontend');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, '');
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:5000';

  return {
    root: frontendRoot,
    envDir: frontendRoot,
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: Number(env.VITE_PORT) || 5173,
      allowedHosts: env.VITE_TUNNEL_HOST ? [env.VITE_TUNNEL_HOST] : [],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
  };
});
