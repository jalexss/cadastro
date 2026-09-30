import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { garantirBanco } from './database/garantir-banco';
import { storageMode } from './database/persistencia';
import { AuditoriaService } from './auditoria/auditoria.service';

async function bootstrap(): Promise<void> {
  if (storageMode() === 'sqlserver') {
    const auditoriaInicial = new AuditoriaService();
    await auditoriaInicial.onModuleInit();
    try { await garantirBanco(auditoriaInicial); }
    finally { await auditoriaInicial.onModuleDestroy(); }
  }
  const app = await NestFactory.create(AppModule, { bodyParser: true, rawBody: false });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((origin) => origin.trim()),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    exposedHeaders: ['x-request-id'],
    credentials: true
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

void bootstrap();
