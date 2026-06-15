import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  assetsInclude: ['**/*.wgsl'],
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'index.ts'),
      fileName: () => 'index.js',
      formats: ['es'],
      name: 'FloatingWorldVAT3ThreeJS',
    },
    minify: false,
    rollupOptions: {
      external: [/^three(\/.*)?$/],
      output: {
        preserveModules: true,
        preserveModulesRoot: '.',
      },
    },
    sourcemap: true,
    target: 'es2022',
  },
  plugins: [
    dts({
      entryRoot: '.',
      insertTypesEntry: true,
      outDir: 'dist',
      rollupTypes: true,
      tsconfigPath: 'tsconfig.json',
    }),
  ],
  resolve: {
    alias: {
      threejs: resolve(__dirname, '.'),
    },
  },
});
