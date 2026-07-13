import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/main.ts', 'src/game/scenes/**'],
    },
  },
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@services': resolve(__dirname, 'src/services'),
      '@data': resolve(__dirname, 'src/game/data'),
    },
  },
});
