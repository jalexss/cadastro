import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { appendFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { contextoAuditoria } from './contexto-auditoria';

@Injectable()
export class AuditoriaService implements OnModuleInit, OnModuleDestroy {
  private queue = Promise.resolve();
  private readonly directory = process.env.LOG_DIRECTORY ?? join(process.cwd(), 'logs');
  private readonly retentionDays = Math.max(1, Number(process.env.LOG_RETENTION_DAYS ?? 30));
  private cleanupTimer?: NodeJS.Timeout;

  async onModuleInit(): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await this.removeExpiredFiles();
    this.cleanupTimer = setInterval(() => { void this.removeExpiredFiles(); }, 24 * 60 * 60 * 1000);
    this.cleanupTimer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    await this.descarregar();
  }

  registrar(evento: string, metadados: Record<string, unknown> = {}): void {
    const requestId = contextoAuditoria.getStore()?.requestId;
    const date = new Date();
    const entry = JSON.stringify({
      timestamp: date.toISOString(),
      evento,
      ...(requestId ? { requestId } : {}),
      ...metadados
    }) + '\n';
    const file = join(this.directory, `auditoria-${date.toISOString().slice(0, 10)}.jsonl`);
    this.queue = this.queue.then(() => appendFile(file, entry, { encoding: 'utf8', mode: 0o600 })).catch(() => {
      process.stderr.write('Falha ao gravar o log diário de auditoria.\n');
    });
  }

  async descarregar(): Promise<void> {
    await this.queue;
  }

  private async removeExpiredFiles(): Promise<void> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.retentionDays);
    const files = await readdir(this.directory).catch(() => []);
    await Promise.all(files.filter((file) => /^auditoria-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file))
      .filter((file) => new Date(`${file.slice(10, 20)}T00:00:00Z`) < cutoff)
      .map((file) => unlink(join(this.directory, file)).catch(() => undefined)));
  }
}
