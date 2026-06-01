import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  // Use relative paths so assets load correctly when index.html is
  // opened via file:// protocol in the packaged Electron app.
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        overlay: 'overlay.html',
      },
    },
  },
});
