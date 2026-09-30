import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AutenticacaoController } from '../src/auth/autenticacao.controller';
import { AutenticacaoService } from '../src/auth/autenticacao.service';
import { RequisicaoAutenticada, SessaoGuard } from '../src/auth/sessao.guard';
import { AuditoriaService } from '../src/auditoria/auditoria.service';

describe('API de autenticação (e2e)', () => {
  let app: INestApplication;
  const autenticacao = {
    autenticar: vi.fn(async () => ({ id: 'recrutador-1', email: 'equipe@example.test', token: 'token-de-teste' })),
    encerrar: vi.fn()
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AutenticacaoController],
      providers: [
        { provide: AutenticacaoService, useValue: autenticacao },
        { provide: AuditoriaService, useValue: { registrar: vi.fn() } },
        SessaoGuard
      ]
    }).overrideGuard(SessaoGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => RequisicaoAutenticada } }) => {
      context.switchToHttp().getRequest().recrutador = { id: 'recrutador-1', email: 'equipe@example.test' };
      return true;
    } }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('emite cookie HttpOnly sem devolver o JWT no corpo', async () => {
    vi.stubEnv('COOKIE_SECURE', 'true');
    const response = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: 'equipe@example.test', senha: 'senha de teste' }).expect(200);
    expect(response.body).toEqual({ recrutador: { id: 'recrutador-1', email: 'equipe@example.test' } });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('Secure');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(JSON.stringify(response.body)).not.toContain('token-de-teste');
    vi.unstubAllEnvs();
  });

  it('limpa a cookie no logout e devolve a sessão autenticada', async () => {
    const logout = await request(app.getHttpServer()).post('/api/auth/logout').expect(200);
    expect(logout.body).toEqual({ encerrada: true });
    expect(logout.headers['set-cookie'][0]).toContain('Max-Age=0');
    const session = await request(app.getHttpServer()).get('/api/auth/sessao').expect(200);
    expect(session.body).toEqual({ recrutador: { id: 'recrutador-1', email: 'equipe@example.test' } });
  });

  it('valida os dados obrigatórios do login', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'inválido', senha: '' }).expect(400);
  });

  it.each([
    { email: 'equipe@', senha: 'senha de teste' },
    { email: 'equipe@@example.test', senha: 'senha de teste' },
    { email: 'equipe@example.test', senha: '' },
    { email: 'equipe@example.test', senha: 'x'.repeat(129) },
    { email: 'equipe@example.test', senha: 'senha de teste', papel: 'admin' }
  ])('rejeita credenciais com formato ou tamanho inválido antes da autenticação', async (dados) => {
    autenticacao.autenticar.mockClear();
    await request(app.getHttpServer()).post('/api/auth/login').send(dados).expect(400);
    expect(autenticacao.autenticar).not.toHaveBeenCalled();
  });
});
