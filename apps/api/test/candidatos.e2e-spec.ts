import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CandidatosController } from '../src/candidatos/candidatos.controller';
import { CandidatosService } from '../src/candidatos/candidatos.service';
import { ExtracaoCurriculoService } from '../src/candidatos/extracao-curriculo.service';
import { FiltroExcecoes } from '../src/common/filtro-excecoes.filter';
import { SessaoGuard } from '../src/auth/sessao.guard';
import { UnauthorizedException } from '@nestjs/common';
import { AuditoriaService } from '../src/auditoria/auditoria.service';

describe('API de candidatos (e2e)', () => {
  let app: INestApplication;
  const service = {
    criar: vi.fn(async (body) => ({ id: '45c29c2e-77e4-4b13-90a4-d5e7ea82362b', ...body, criadoEm: new Date('2026-01-01T00:00:00Z') })),
    listar: vi.fn(async (pagina, limite) => ({ itens: [], pagina, limite, total: 0 })),
    buscarPorId: vi.fn(async () => ({ id: '45c29c2e-77e4-4b13-90a4-d5e7ea82362b', nomeCompleto: 'Ana Silva', email: 'ana@example.com' }))
  };
  const extracao = { extrair: vi.fn(async () => ({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' })) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [CandidatosController],
      providers: [
        { provide: CandidatosService, useValue: service },
        { provide: ExtracaoCurriculoService, useValue: extracao },
        { provide: AuditoriaService, useValue: { registrar: vi.fn() } },
        SessaoGuard
      ]
    }).overrideGuard(SessaoGuard).useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: { cookie?: string }; recrutador?: { id: string; email: string } } } }) => {
          if (context.switchToHttp().getRequest().headers.cookie === 'sessao=autenticada') return true;
          throw new UnauthorizedException('Faça login para consultar os candidatos.');
        } }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new FiltroExcecoes({ registrar: vi.fn() } as never));
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('valida e cadastra por meio da API', async () => {
    const response = await request(app.getHttpServer()).post('/api/candidatos').send({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' }).expect(201);
    expect(response.body).toMatchObject({ id: '45c29c2e-77e4-4b13-90a4-d5e7ea82362b', criadoEm: '2026-01-01T00:00:00.000Z' });
    expect(service.criar).toHaveBeenCalledOnce();
  });

  it('rejeita e-mail inválido na API', async () => {
    const response = await request(app.getHttpServer()).post('/api/candidatos').send({ nomeCompleto: 'Ana Silva', email: 'inválido' }).expect(400);
    expect(response.body.message).toBe('Revise os campos informados.');
  });

  it.each(['ana@', 'ana@@example.com', 'ana..silva@example.com', 'ana @example.com', 'ana@example.com<script>'])('rejeita e-mail fora do formato esperado: %s', async (email) => {
    await request(app.getHttpServer()).post('/api/candidatos').send({ nomeCompleto: 'Ana Silva', email }).expect(400);
  });

  it('bloqueia a lista sem sessão e lista com parâmetros validados após login', async () => {
    await request(app.getHttpServer()).get('/api/candidatos?pagina=2&limite=10').expect(401);
    const response = await request(app.getHttpServer()).get('/api/candidatos?pagina=2&limite=10').set('Cookie', 'sessao=autenticada').expect(200);
    expect(response.body).toMatchObject({ pagina: 2, limite: 10, total: 0 });
  });

  it('protege também o detalhe sem impedir o cadastro público', async () => {
    await request(app.getHttpServer()).get('/api/candidatos/45c29c2e-77e4-4b13-90a4-d5e7ea82362b').expect(401);
    await request(app.getHttpServer()).get('/api/candidatos/45c29c2e-77e4-4b13-90a4-d5e7ea82362b').set('Cookie', 'sessao=autenticada').expect(200);
    await request(app.getHttpServer()).post('/api/candidatos').send({ nomeCompleto: 'Ana Silva', email: 'ana@example.com' }).expect(201);
  });

  it('extrai campos do PDF sem criar o candidato', async () => {
    service.criar.mockClear();
    const response = await request(app.getHttpServer()).post('/api/candidatos/extrair-curriculo')
      .attach('arquivo', Buffer.from('%PDF-1.7 conteúdo de teste'), { filename: 'curriculo.pdf', contentType: 'application/pdf' }).expect(201);
    expect(response.body.campos).toHaveProperty('email', 'ana@example.com');
    expect(extracao.extrair).toHaveBeenCalledOnce();
    expect(service.criar).not.toHaveBeenCalled();
  });

  it('rejeita extensão ou tipo incompatível', async () => {
    const response = await request(app.getHttpServer()).post('/api/candidatos/extrair-curriculo')
      .attach('arquivo', Buffer.from('não é PDF'), { filename: 'curriculo.txt', contentType: 'text/plain' }).expect(400);
    expect(response.body.message).toBe('Envie um arquivo PDF válido.');
  });

  it('rejeita arquivo PDF acima de 5 MB antes de tentar a leitura', async () => {
    const grande = Buffer.alloc(5 * 1024 * 1024 + 1, 65);
    grande.write('%PDF-1.7');
    await request(app.getHttpServer()).post('/api/candidatos/extrair-curriculo')
      .attach('arquivo', grande, { filename: 'curriculo.pdf', contentType: 'application/pdf' }).expect(413);
    expect(extracao.extrair).not.toHaveBeenCalled();
  });
});
