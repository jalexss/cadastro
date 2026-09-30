import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CandidatoEntity } from './candidato.entity';
import { CriarTabelaCandidatos1710000000000 } from './migrations/1710000000000-CriarTabelaCandidatos';
import { CriarTabelaRecrutadores1801300000000 } from './migrations/1801300000000-CriarTabelaRecrutadores';
import { AdicionarCurriculoPdf1802000000000 } from './migrations/1802000000000-AdicionarCurriculoPdf';
import { RecrutadorEntity } from './recrutador.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { LoggerTypeOrmSeguro } from '../auditoria/logger-typeorm';

export function databaseOptions(auditoria: AuditoriaService): TypeOrmModuleOptions {
  return {
    type: 'mssql',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 1433),
    username: process.env.DATABASE_USER ?? 'sa',
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME ?? 'CadastroCandidatos',
    entities: [CandidatoEntity, RecrutadorEntity],
    migrations: [CriarTabelaCandidatos1710000000000, CriarTabelaRecrutadores1801300000000, AdicionarCurriculoPdf1802000000000],
    migrationsRun: true,
    synchronize: false,
    logger: new LoggerTypeOrmSeguro(auditoria),
    options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true },
    extra: { trustServerCertificate: true, enableArithAbort: true },
    retryAttempts: 20,
    retryDelay: 3000,
    maxQueryExecutionTime: 1000
  } as TypeOrmModuleOptions;
}
