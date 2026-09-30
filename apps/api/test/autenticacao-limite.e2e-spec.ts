import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AutenticacaoController } from '../src/auth/autenticacao.controller';
import { AutenticacaoService } from '../src/auth/autenticacao.service';
import { AuditoriaService } from '../src/auditoria/auditoria.service';

describe('limite de tentativas de login (e2e)', () => {
  let app: INestApplication;
  const autenticacao = {
    autenticar: vi.fn(async () => ({ id: 'recrutador-1', email: 'equipe@example.test', token: 'token-de-teste' })),
    encerrar: vi.fn()
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
      controllers: [AutenticacaoController],
      providers: [
        { provide: AutenticacaoService, useValue: autenticacao },
        { provide: AuditoriaService, useValue: { registrar: vi.fn() } },
        { provide: APP_GUARD, useClass: ThrottlerGuard }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('permite cinco tentativas e bloqueia a sexta por janela de limite', async () => {
    const servidor = app.getHttpServer();
    const dados = { email: 'equipe@example.test', senha: 'senha de teste' };
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      await request(servidor).post('/api/auth/login').send(dados).expect(200);
    }
    const bloqueada = await request(servidor).post('/api/auth/login').send(dados).expect(429);
    expect(bloqueada.body.message).toMatch(/Too Many Requests/i);
    expect(autenticacao.autenticar).toHaveBeenCalledTimes(5);
  });
});
