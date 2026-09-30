import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

for (const diretorio of [process.cwd(), resolve(process.cwd(), '../..')]) {
  const arquivoEnv = resolve(diretorio, '.env');
  if (existsSync(arquivoEnv)) {
    process.loadEnvFile(arquivoEnv);
    break;
  }
}

const canalNavegador = process.env.PLAYWRIGHT_CHANNEL;

export default defineConfig({
  testDir: '.',
  testMatch: 'e2e-navegador.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: process.env.WEB_BASE_URL ?? 'http://localhost:5173',
    browserName: 'chromium',
    headless: true,
    launchOptions: canalNavegador ? { channel: canalNavegador } : {},
    trace: 'retain-on-failure'
  },
  outputDir: '../../../test-results/e2e-navegador'
});
