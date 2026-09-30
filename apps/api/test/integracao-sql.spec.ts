import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource, type DataSourceOptions } from 'typeorm';
import sql from 'mssql';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AuditoriaService } from '../src/auditoria/auditoria.service';
import { LoggerTypeOrmSeguro } from '../src/auditoria/logger-typeorm';
import { CandidatoEntity } from '../src/database/candidato.entity';
import { RecrutadorEntity } from '../src/database/recrutador.entity';
import { CriarTabelaCandidatos1710000000000 } from '../src/database/migrations/1710000000000-CriarTabelaCandidatos';
import { CriarTabelaRecrutadores1801300000000 } from '../src/database/migrations/1801300000000-CriarTabelaRecrutadores';
import { PersistenciaSqlService } from '../src/database/persistencia-sql.service';
import { databaseOptions } from '../src/database/database.options';

const arquivoEnv = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv);

interface ConexaoSql {
  server: string;
  port: number;
  user: string;
  password: string;
  options: { encrypt: boolean; trustServerCertificate: boolean; enableArithAbort: boolean };
}

const nomeBancoTeste = `CadastroCandidatosTeste${process.pid}${Date.now()}`;
const auditoriaOriginal = process.env.LOG_DIRECTORY;
let diretorioLogsTeste: string | undefined;
let poolAdministrativo: sql.ConnectionPool | undefined;
let fonte: DataSource | undefined;
let persistencia: PersistenciaSqlService | undefined;
let auditoriaSql: AuditoriaService | undefined;
const registrosCriados: Array<{ id: string; email: string }> = [];

function conexaoSql(database: string): ConexaoSql & { database: string } {
  const password = process.env.SQL_SA_PASSWORD ?? process.env.DATABASE_PASSWORD;
  if (!password) throw new Error('Defina SQL_SA_PASSWORD ou DATABASE_PASSWORD para executar a integração SQL.');
  return {
    server: process.env.SQL_TEST_HOST ?? process.env.DATABASE_HOST ?? '127.0.0.1',
    port: Number(process.env.SQL_TEST_PORT ?? process.env.DATABASE_PORT ?? process.env.SQL_PORT ?? 1433),
    user: process.env.DATABASE_USER ?? 'sa',
    password,
    database,
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
  };
}

function novaFonte(auditoria: AuditoriaService): DataSource {
  const opcoes = databaseOptions(auditoria) as unknown as DataSourceOptions;
  const conexao = conexaoSql(nomeBancoTeste);
  return new DataSource({
    ...opcoes,
    host: conexao.server,
    port: conexao.port,
    username: conexao.user,
    password: conexao.password,
    database: nomeBancoTeste,
    entities: [CandidatoEntity, RecrutadorEntity],
    migrations: [CriarTabelaCandidatos1710000000000, CriarTabelaRecrutadores1801300000000],
    migrationsRun: true,
    synchronize: false,
    logger: new LoggerTypeOrmSeguro(auditoria)
  });
}

describe('integração real com SQL Server', () => {
  beforeAll(async () => {
    diretorioLogsTeste = await mkdtemp(join(tmpdir(), 'cadastro-sql-logs-'));
    process.env.LOG_DIRECTORY = diretorioLogsTeste;

    const conexaoAdmin = conexaoSql('master');
    poolAdministrativo = await new sql.ConnectionPool(conexaoAdmin).connect();
    await poolAdministrativo.request().query(`CREATE DATABASE [${nomeBancoTeste}]`);

    auditoriaSql = new AuditoriaService();
    await auditoriaSql.onModuleInit();
    fonte = novaFonte(auditoriaSql);
    await fonte.initialize();
    persistencia = new PersistenciaSqlService(
      fonte.getRepository(CandidatoEntity),
      fonte.getRepository(RecrutadorEntity)
    );
  });

  afterAll(async () => {
    await fonte?.destroy().catch(() => undefined);
    if (poolAdministrativo) {
      try {
        await poolAdministrativo.request().query(`
          ALTER DATABASE [${nomeBancoTeste}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
          DROP DATABASE [${nomeBancoTeste}];
        `);
      } finally {
        await poolAdministrativo.close();
      }
    }
    await auditoriaSql?.onModuleDestroy();
    if (diretorioLogsTeste) await rm(diretorioLogsTeste, { recursive: true, force: true });
    if (auditoriaOriginal === undefined) delete process.env.LOG_DIRECTORY;
    else process.env.LOG_DIRECTORY = auditoriaOriginal;
  });

  it('executa migrations, CRUD, paginação e mantém registros após reconectar', async () => {
    if (!persistencia || !fonte) throw new Error('A conexão de teste com SQL Server não foi inicializada.');

    for (let indice = 1; indice <= 3; indice += 1) {
      const email = `integracao-${randomUUID()}@example.test`;
      const candidato = await persistencia.criarCandidato({
        nomeCompleto: `Candidato SQL ${indice}`,
        email: email.toUpperCase(),
        telefone: `+55 11 99999-000${indice}`,
        areaInteresse: 'Engenharia de software',
        resumoProfissional: 'Perfil sintético de integração com SQL Server.'
      });
      registrosCriados.push({ id: candidato.id, email });
      expect(candidato.email).toBe(email);
      expect(await persistencia.existeCandidatoComEmail(email)).toBe(true);
    }

    const primeiraPagina = await persistencia.listarCandidatos(1, 2);
    const segundaPagina = await persistencia.listarCandidatos(2, 2);
    expect(primeiraPagina.itens).toHaveLength(2);
    expect(segundaPagina.itens).toHaveLength(1);
    expect(primeiraPagina.total).toBe(3);
    expect(segundaPagina.total).toBe(3);

    const idPersistido = registrosCriados[0]!.id;
    const detalhe = await persistencia.buscarCandidatoPorId(idPersistido);
    expect(detalhe?.nomeCompleto).toBe('Candidato SQL 1');

    await fonte.destroy();
    fonte = novaFonte(auditoriaSql!);
    await fonte.initialize();
    persistencia = new PersistenciaSqlService(
      fonte.getRepository(CandidatoEntity),
      fonte.getRepository(RecrutadorEntity)
    );

    const aposReconexao = await persistencia.buscarCandidatoPorId(idPersistido);
    expect(aposReconexao?.email).toBe(registrosCriados[0]!.email);
    expect((await persistencia.listarCandidatos(1, 10)).total).toBe(3);
  });
});
