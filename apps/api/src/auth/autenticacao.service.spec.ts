import { describe, expect, it, vi } from 'vitest';
import { hash, argon2id } from 'argon2';
import { jwtVerify } from 'jose';
import { AutenticacaoService } from './autenticacao.service';

describe('AutenticacaoService', () => {
  it('emite uma sessão assinada após validar a senha e audita sem PII', async () => {
    vi.stubEnv('JWT_SECRET', 'segredo-de-teste-com-mais-de-trinta-e-dois-bytes');
    const senhaHash = await hash('SenhaForteDeTeste!2026', { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const persistencia = { buscarRecrutadorPorEmail: vi.fn(async () => ({ id: 'id-recrutador', email: 'equipe@example.test', senhaHash })) };
    const auditoria = { registrar: vi.fn() };
    const service = new AutenticacaoService(persistencia as never, auditoria as never);
    await service.onModuleInit();

    const sessao = await service.autenticar('EQUIPE@example.test', 'SenhaForteDeTeste!2026');
    const { payload } = await jwtVerify(sessao.token, new TextEncoder().encode(process.env.JWT_SECRET));
    expect(payload.sub).toBe('id-recrutador');
    expect(sessao).not.toHaveProperty('senhaHash');
    expect(auditoria.registrar).toHaveBeenCalledWith('auth.login', { resultado: 'aceito' });
    expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain('equipe@example.test');
    expect(JSON.stringify(auditoria.registrar.mock.calls)).not.toContain('SenhaForte');
    vi.unstubAllEnvs();
  });

  it('nega a senha incorreta com mensagem genérica', async () => {
    vi.stubEnv('JWT_SECRET', 'segredo-de-teste-com-mais-de-trinta-e-dois-bytes');
    const senhaHash = await hash('SenhaForteDeTeste!2026', { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
    const persistencia = { buscarRecrutadorPorEmail: vi.fn(async () => ({ id: 'id-recrutador', email: 'equipe@example.test', senhaHash })) };
    const service = new AutenticacaoService(persistencia as never, { registrar: vi.fn() } as never);
    await service.onModuleInit();
    await expect(service.autenticar('equipe@example.test', 'senha-errada')).rejects.toThrow('E-mail ou senha inválidos.');
    vi.unstubAllEnvs();
  });
});
