/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks: app updates do not force re-downloading libraries
        // on low-bandwidth farm connections.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/recharts|d3-|victory-vendor|redux|immer|reselect/.test(id)) return 'charts';
          if (id.includes('lucide-react')) return 'icons';
          if (/[/\\]react(-dom)?[/\\]|scheduler/.test(id)) return 'react';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
