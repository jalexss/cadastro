import { ConnectionPool } from 'mssql';
import { AuditoriaService } from '../auditoria/auditoria.service';

export async function garantirBanco(auditoria: AuditoriaService): Promise<void> {
  const database = process.env.DATABASE_NAME ?? 'CadastroCandidatos';
  if (!/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(database)) throw new Error('Nome de banco inválido.');
  const pool = new ConnectionPool({
    server: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 1433),
    user: process.env.DATABASE_USER ?? 'sa',
    password: process.env.DATABASE_PASSWORD,
    database: 'master',
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
  });
  try {
    await pool.connect();
    auditoria.registrar('banco.inicializacao', { operacao: 'verificar_ou_criar_database', resultado: 'iniciado' });
    await pool.request().query(`IF DB_ID(N'${database}') IS NULL EXEC('CREATE DATABASE [${database}]')`);
    auditoria.registrar('banco.inicializacao', { operacao: 'verificar_ou_criar_database', resultado: 'concluido' });
  } catch (error) {
    auditoria.registrar('banco.inicializacao', { operacao: 'verificar_ou_criar_database', resultado: 'falha', tipo: error instanceof Error ? error.name : 'Erro' });
    throw error;
  } finally {
    await pool.close();
  }
}
