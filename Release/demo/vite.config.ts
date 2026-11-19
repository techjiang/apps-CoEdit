import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      coedit: fileURLToPath(new URL('../../packages/coedit/src/index.ts', import.meta.url)),
    },
  },
});
