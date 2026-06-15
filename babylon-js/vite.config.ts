import { resolve } from 'node:path';

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
      name: 'FloatingWorldVAT3',
    },
    minify: false,
    rollupOptions: {
      external: [
        /^@babylonjs\/core(\/.*)?$/,
        /^@babylonjs\/loaders(\/.*)?$/,
      ],
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
      babylon: resolve(__dirname, '.'),
    },
  },
});
