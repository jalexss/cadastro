import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';

const arquivoEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);

const apiBase = (process.env.API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/$/, '');
const emailRecrutador = process.env.AUTH_BOOTSTRAP_EMAIL;
const senhaRecrutador = process.env.AUTH_BOOTSTRAP_PASSWORD;
const senhaBanco = process.env.SQL_SA_PASSWORD ?? process.env.DATABASE_PASSWORD;
const modoArmazenamento = process.env.STORAGE_MODE ?? 'sqlserver';
const emailCandidatoTemporario = `integracao-${randomUUID()}@example.test`;
let idCandidatoTemporario = '';
let cookieSessao = '';
let candidatoCriado = false;

if (modoArmazenamento !== 'sqlserver') {
  throw new Error('Este fluxo exige STORAGE_MODE=sqlserver para confirmar a persistência real.');
}
if (!emailRecrutador || !senhaRecrutador || !senhaBanco) {
  throw new Error('Defina as credenciais locais do recrutador e SQL Server no arquivo .env.');
}

const sqlConfig = {
  server: process.env.SQL_TEST_HOST ?? process.env.DATABASE_HOST ?? '127.0.0.1',
  port: Number(process.env.SQL_TEST_PORT ?? process.env.DATABASE_PORT ?? process.env.SQL_PORT ?? 1433),
  user: process.env.DATABASE_USER ?? 'sa',
  password: senhaBanco,
  database: process.env.SQL_DATABASE ?? process.env.DATABASE_NAME ?? 'CadastroCandidatos',
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function pedir(caminho, options) {
  const response = await fetch(`${apiBase}${caminho}`, options);
  const texto = await response.text();
  let body;
  try { body = texto ? JSON.parse(texto) : undefined; } catch { body = undefined; }
  return { response, body };
}

try {
  const acessoAnonimo = await pedir('/candidatos?pagina=1&limite=10');
  assert.equal(acessoAnonimo.response.status, 401, 'a listagem deve exigir sessão');

  const cadastro = await pedir('/candidatos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nomeCompleto: 'Candidatura de integração automatizada',
      email: emailCandidatoTemporario,
      telefone: '+55 11 99999-1234',
      areaInteresse: 'Teste de integração',
      resumoProfissional: 'Registro sintético temporário para verificar a aplicação completa.'
    })
  });
  assert.equal(cadastro.response.status, 201, 'o cadastro público deve ser aceito');
  assert.match(cadastro.body?.id ?? '', /^[0-9a-f-]{36}$/i, 'a API deve retornar um identificador UUID');
  idCandidatoTemporario = cadastro.body.id;
  candidatoCriado = true;

  const login = await pedir('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: emailRecrutador, senha: senhaRecrutador })
  });
  assert.equal(login.response.status, 200, 'o recrutador inicial deve conseguir entrar');
  cookieSessao = login.response.headers.get('set-cookie')?.split(';', 1)[0] ?? '';
  assert.match(cookieSessao, /^sessao=/, 'a sessão deve ser emitida em cookie');

  const cabecalhos = { Cookie: cookieSessao };
  const lista = await pedir('/candidatos?pagina=1&limite=100', { headers: cabecalhos });
  assert.equal(lista.response.status, 200, 'a listagem deve funcionar com sessão');
  assert.ok(lista.body?.itens?.some((item) => item.id.toLowerCase() === idCandidatoTemporario), 'o cadastro deve aparecer na listagem');

  const detalhe = await pedir(`/candidatos/${idCandidatoTemporario}`, { headers: cabecalhos });
  assert.equal(detalhe.response.status, 200, 'o detalhe deve funcionar com sessão');
  assert.equal(detalhe.body?.email, emailCandidatoTemporario);

  const pool = await new sql.ConnectionPool(sqlConfig).connect();
  try {
    const registro = await pool.request()
      .input('id', sql.UniqueIdentifier, idCandidatoTemporario)
      .query('SELECT [id] FROM [candidatos] WHERE [id] = @id');
    assert.equal(registro.recordset.length, 1, 'o candidato precisa existir no SQL Server real');
  } finally {
    await pool.close();
  }

  console.log('Fluxo API + SQL Server aprovado: cadastro público, login, listagem, detalhe e persistência.');
} finally {
  if (candidatoCriado) {
    const pool = await new sql.ConnectionPool(sqlConfig).connect();
    try {
      await pool.request().input('id', sql.UniqueIdentifier, idCandidatoTemporario)
        .query('DELETE FROM [candidatos] WHERE [id] = @id');
    } finally {
      await pool.close();
    }
  }
}
