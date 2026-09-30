import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { CandidatoEntity } from './candidato.entity';
import { databaseOptions } from './database.options';
import { CriarTabelaRecrutadores1801300000000 } from './migrations/1801300000000-CriarTabelaRecrutadores';
import { PersistenciaMemoriaService } from './persistencia-memoria.service';
import { PersistenciaSqlService } from './persistencia-sql.service';
import { PERSISTENCIA, storageMode } from './persistencia';
import { RecrutadorEntity } from './recrutador.entity';

const modo = storageMode();
const integracaoSql = modo === 'sqlserver'
  ? [
      TypeOrmModule.forRootAsync({ imports: [AuditoriaModule], inject: [AuditoriaService], useFactory: databaseOptions }),
      TypeOrmModule.forFeature([CandidatoEntity, RecrutadorEntity])
    ]
  : [];

@Global()
@Module({
  imports: integracaoSql,
  providers: [{ provide: PERSISTENCIA, useClass: modo === 'memory' ? PersistenciaMemoriaService : PersistenciaSqlService }],
  exports: [PERSISTENCIA]
})
export class PersistenciaModule {}
