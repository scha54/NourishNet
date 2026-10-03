import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Keep in sync with the `@/*` path alias in tsconfig.json.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
