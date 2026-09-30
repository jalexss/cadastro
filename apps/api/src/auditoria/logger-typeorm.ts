import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { AuditoriaService } from './auditoria.service';

export class LoggerTypeOrmSeguro implements TypeOrmLogger {
  constructor(private readonly auditoria: AuditoriaService) {}

  logQuery(query: string): void {
    this.auditoria.registrar('banco.consulta', this.metadados(query));
  }

  logQueryError(_error: string | Error, query: string): void {
    this.auditoria.registrar('banco.falha', this.metadados(query));
  }

  logQuerySlow(time: number, query: string): void {
    this.auditoria.registrar('banco.consulta_lenta', { ...this.metadados(query), duracaoMs: time });
  }

  logSchemaBuild(_message: string): void {
    this.auditoria.registrar('banco.esquema');
  }

  logMigration(_message: string): void {
    this.auditoria.registrar('banco.migracao');
  }

  log(_level: 'log' | 'info' | 'warn', _message: unknown, _queryRunner?: QueryRunner): void {
    // Mensagens genéricas do driver podem conter valores; ficam intencionalmente fora dos logs.
  }

  private metadados(query: string): Record<string, string> {
    const operation = query.trim().match(/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|BEGIN|COMMIT|ROLLBACK)\b/i)?.[1]?.toUpperCase() ?? 'OTHER';
    return { operacao: operation, fingerprint: createHash('sha256').update(query).digest('hex').slice(0, 16) };
  }
}
