import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { databaseOptions } from './database.options';
import { CriarTabelaCandidatos1710000000000 } from './migrations/1710000000000-CriarTabelaCandidatos';
import { CriarTabelaRecrutadores1801300000000 } from './migrations/1801300000000-CriarTabelaRecrutadores';
import { AdicionarCurriculoPdf1802000000000 } from './migrations/1802000000000-AdicionarCurriculoPdf';

const auditoria = new AuditoriaService();
void auditoria.onModuleInit();

export default new DataSource({ ...databaseOptions(auditoria), migrations: [
  CriarTabelaCandidatos1710000000000,
  CriarTabelaRecrutadores1801300000000,
  AdicionarCurriculoPdf1802000000000
], migrationsRun: false } as never);
