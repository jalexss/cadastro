import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@cadastro/contratos': fileURLToPath(new URL('../../packages/contratos/src/index.ts', import.meta.url)) } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    include: ['src/**/*.spec.tsx'],
    fileParallelism: false,
    testTimeout: 20_000,
    coverage: { provider: 'v8', reporter: ['text', 'lcov'] }
  }
});
