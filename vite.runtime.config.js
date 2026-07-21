import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/runtime/index.js'),
      name: 'NovaFX',
      fileName: (format) => `novafx.${format}.js`,
      formats: ['es', 'iife'],
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
});