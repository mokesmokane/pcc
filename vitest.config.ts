import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    include: ['**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: ['node_modules', 'dist', '.expo'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
});