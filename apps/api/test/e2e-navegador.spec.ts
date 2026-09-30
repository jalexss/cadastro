import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

for (const diretorio of [process.cwd(), resolve(process.cwd(), '../..')]) {
  const arquivoEnv = resolve(diretorio, '.env');
  if (existsSync(arquivoEnv)) {
    process.loadEnvFile(arquivoEnv);
    break;
  }
}

const urlWeb = process.env.WEB_BASE_URL ?? 'http://localhost:5173';
const emailRecrutador = `e2e-recrutador-${randomUUID()}@example.test`;
const senhaRecrutador = randomBytes(32).toString('base64url');
const emailCandidato = `e2e-${randomUUID()}@example.test`;
let dadosDeTestePodemExistir = false;
const raizRepositorio = existsSync(resolve(process.cwd(), 'docker-compose.yml'))
  ? process.cwd()
  : resolve(process.cwd(), '../..');

function exigirConfiguracao(): void {
  if ((process.env.STORAGE_MODE ?? 'sqlserver') !== 'sqlserver') {
    throw new Error('A prova navegador–API–SQL exige STORAGE_MODE=sqlserver.');
  }
}

test.beforeAll(() => {
  exigirConfiguracao();
  dadosDeTestePodemExistir = true;
  executarSqlNoCompose('criar_recrutador');
});

function executarSqlNoCompose(operacao: 'criar_recrutador' | 'consultar_candidato' | 'limpar'): string {
  const script = `
    const sql = require('mssql');
    const argon2 = require('argon2');
    const { randomUUID } = require('node:crypto');
    let entrada = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (parte) => { entrada += parte; });
    process.stdin.on('end', () => {
      void (async () => {
        const dados = JSON.parse(entrada);
        const conexao = await sql.connect({
          server: process.env.DATABASE_HOST,
          port: Number(process.env.DATABASE_PORT),
          user: process.env.DATABASE_USER,
          password: process.env.DATABASE_PASSWORD,
          database: process.env.DATABASE_NAME,
          options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
        });
        try {
          if (dados.operacao === 'criar_recrutador') {
            const hash = await argon2.hash(dados.senha, {
              type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1
            });
            await conexao.request()
              .input('id', sql.UniqueIdentifier, randomUUID())
              .input('email', sql.NVarChar(254), dados.emailRecrutador)
              .input('hash', sql.NVarChar(255), hash)
              .query('INSERT INTO [recrutadores] ([id], [email], [senha_hash]) VALUES (@id, @email, @hash)');
            process.stdout.write('ok');
          } else if (dados.operacao === 'limpar') {
            const remocao = await conexao.request()
              .input('candidato', sql.NVarChar(254), dados.emailCandidato)
              .input('recrutador', sql.NVarChar(254), dados.emailRecrutador)
              .query('DELETE FROM [candidatos] WHERE [email] = @candidato; DELETE FROM [recrutadores] WHERE [email] = @recrutador');
            process.stdout.write(JSON.stringify(remocao.rowsAffected));
          } else {
            const resultado = await conexao.request()
              .input('email', sql.NVarChar(254), dados.emailCandidato)
              .query('SELECT [nome_completo], [email] FROM [candidatos] WHERE [email] = @email');
            process.stdout.write(JSON.stringify(resultado.recordset));
          }
        } finally {
          await conexao.close();
        }
      })().catch((erro) => {
        console.error(erro.code || 'sql-query-failed');
        process.exitCode = 1;
      });
    });
  `;
  const entrada = JSON.stringify({ operacao, emailRecrutador, senha: senhaRecrutador, emailCandidato });
  const resultado = spawnSync('docker', [
    'compose', 'exec', '-T', 'api', 'node', '-e', script
  ], { cwd: raizRepositorio, encoding: 'utf8', input: entrada, timeout: 20_000 });
  assert.equal(resultado.error, undefined, resultado.error?.message);
  assert.equal(resultado.status, 0, `Falha na consulta SQL via serviço Compose: ${resultado.stderr.trim()}`);
  return resultado.stdout;
}

test.afterAll(async () => {
  if (!dadosDeTestePodemExistir) return;
  const removidos = JSON.parse(executarSqlNoCompose('limpar')) as number[];
  expect(removidos).toHaveLength(2);
  expect(removidos[0]).toBeLessThanOrEqual(1);
  expect(removidos[1]).toBe(1);
});

test('cadastra no navegador, autentica, consulta e confirma persistencia no SQL Server', async ({ page, request }) => {
  const nomeCandidato = `Candidato E2E ${randomUUID().slice(0, 8)}`;
  const respostaAnonima = await request.get(`${urlWeb}/api/candidatos?pagina=1&limite=10`);
  expect(respostaAnonima.status(), 'a API deve proteger a listagem antes do login').toBe(401);

  await test.step('cadastrar candidato pela interface pública', async () => {
    await page.goto('/candidatos/novo');
    await page.getByLabel('Nome completo').fill(nomeCandidato);
    await page.getByLabel('E-mail').first().fill(emailCandidato);
    await page.getByLabel('Telefone').fill('+55 11 99999-1234');
    await page.getByLabel('Área ou cargo de interesse').fill('Teste ponta a ponta');
    await page.getByLabel('Resumo profissional').fill('Registro sintético para validar navegador, API e SQL Server.');

    const respostaCadastro = page.waitForResponse((response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/candidatos');
    dadosDeTestePodemExistir = true;
    await page.getByRole('button', { name: 'Salvar candidato' }).click();
    const cadastro = await respostaCadastro;
    expect(cadastro.status()).toBe(201);
    await expect(page.getByRole('heading', { name: 'Cadastro realizado com sucesso.' })).toBeVisible();
  });

  await test.step('iniciar sessão e localizar o candidato na listagem', async () => {
    await page.getByRole('link', { name: 'Entrar para consultar' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel('E-mail').fill(emailRecrutador!);
    await page.getByLabel('Senha').fill(senhaRecrutador!);

    const respostaLogin = page.waitForResponse((response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/login');
    const respostaLista = page.waitForResponse((response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/candidatos');
    await page.getByRole('button', { name: 'Entrar' }).click();
    const login = await respostaLogin;
    expect(login.status()).toBe(200);
    const lista = await respostaLista;
    expect(lista.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Candidatos', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: `Ver ${nomeCandidato}` })).toBeVisible();
  });

  await test.step('abrir o detalhe e verificar o registro diretamente no SQL Server', async () => {
    const respostaDetalhe = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname.startsWith('/api/candidatos/'));
    await page.getByRole('link', { name: `Ver ${nomeCandidato}` }).click();
    expect((await respostaDetalhe).status()).toBe(200);
    await expect(page.getByRole('heading', { name: nomeCandidato })).toBeVisible();
    await expect(page.getByText(emailCandidato, { exact: true })).toBeVisible();

    const registros = JSON.parse(executarSqlNoCompose('consultar_candidato')) as Array<{ nome_completo: string; email: string }>;
    expect(registros).toEqual([{ nome_completo: nomeCandidato, email: emailCandidato }]);
  });
});
