import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/types/**'],
      exclude: ['src/lib/db.ts', 'src/lib/offline.ts', 'src/lib/queries.ts'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
