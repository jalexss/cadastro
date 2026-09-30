import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@cadastro/contratos': fileURLToPath(new URL('../../packages/contratos/src/index.ts', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 15_000
  }
});
