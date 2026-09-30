import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuditoriaService } from './auditoria.service';
import { LoggerTypeOrmSeguro } from './logger-typeorm';
import { contextoAuditoria } from './contexto-auditoria';

describe('LoggerTypeOrmSeguro', () => {
  let directory: string;
  afterEach(async () => {
    vi.unstubAllEnvs();
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('audita a consulta e request id sem gravar SQL literal ou parâmetros', async () => {
    directory = await mkdtemp(join(tmpdir(), 'auditoria-candidato-'));
    vi.stubEnv('LOG_DIRECTORY', directory);
    const auditoria = new AuditoriaService();
    await auditoria.onModuleInit();
    const logger = new LoggerTypeOrmSeguro(auditoria);
    contextoAuditoria.run({ requestId: 'teste-request-id' }, () => logger.logQuery('SELECT * FROM candidatos WHERE email = @0', ['ana@example.com']));
    await auditoria.descarregar();
    const file = (await import('node:fs/promises')).readdir(directory).then((files) => files[0]);
    const contents = await readFile(join(directory, await file), 'utf8');
    expect(contents).toContain('teste-request-id');
    expect(contents).toContain('banco.consulta');
    expect(contents).not.toContain('ana@example.com');
    expect(contents).not.toContain('SELECT *');
    await auditoria.onModuleDestroy();
  });
});
