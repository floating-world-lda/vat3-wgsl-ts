import { resolve } from 'node:path';

import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.wgsl'],
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      fileName: () => 'index.js',
      formats: ['iife'],
      name: 'FloatingWorldVAT3',
    },
    minify: false,
    rollupOptions: {
      external: (id) => id.startsWith('@babylonjs/'),
      output: {
        globals: (id) => id.startsWith('@babylonjs/') ? 'BABYLON' : id,
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
  plugins: [],
  resolve: {
    alias: {
      babylon: resolve(__dirname, '.'),
    },
  },
});
