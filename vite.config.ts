import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  return {
    server: {
      port: 3180,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    preview: {
      port: 3180,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      'global': 'window',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
