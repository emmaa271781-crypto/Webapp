import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './src',
  build: {
    outDir: '../public',
    emptyOutDir: true, // This should delete everything in public/ before building
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
    },
    // Copy service worker after build
    copyPublicDir: false,
    // Ensure index.html is always generated
    manifest: false,
  },
  publicDir: false, // Don't copy public dir contents
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3000',
      },
    },
  },
});
