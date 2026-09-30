import { describe, expect, it, vi } from 'vitest';
import { SignJWT } from 'jose';
import { SessaoGuard, RequisicaoAutenticada } from './sessao.guard';

const secret = new TextEncoder().encode('segredo-de-teste-com-mais-de-trinta-e-dois-bytes');

function contexto(cookie?: string) {
  const request = { headers: { cookie }, method: 'GET', route: { path: '/candidatos' } };
  return { request, switchToHttp: () => ({ getRequest: () => request }) };
}

describe('SessaoGuard', () => {
  it('valida a sessão e anexa a identidade sem consultar parâmetros da URL', async () => {
    vi.stubEnv('JWT_SECRET', Buffer.from(secret).toString());
    const token = await new SignJWT({ email: 'equipe@example.test' }).setProtectedHeader({ alg: 'HS256' }).setSubject('recrutador-1').setExpirationTime('5m').sign(secret);
    const request = contexto(`sessao=${token}`).request as RequisicaoAutenticada;
    const guard = new SessaoGuard({ registrar: vi.fn() } as never);
    await expect(guard.canActivate({ ...contexto(`sessao=${token}`), switchToHttp: () => ({ getRequest: () => request }) } as never)).resolves.toBe(true);
    expect(request.recrutador).toEqual({ id: 'recrutador-1', email: 'equipe@example.test' });
    vi.unstubAllEnvs();
  });

  it('rejeita sessão ausente e expirada', async () => {
    vi.stubEnv('JWT_SECRET', Buffer.from(secret).toString());
    const expired = await new SignJWT({ email: 'equipe@example.test' }).setProtectedHeader({ alg: 'HS256' }).setSubject('r1').setExpirationTime(1).sign(secret);
    const guard = new SessaoGuard({ registrar: vi.fn() } as never);
    await expect(guard.canActivate(contexto() as never)).rejects.toThrow('Faça login');
    await expect(guard.canActivate(contexto('sessao=token-malformado') as never)).rejects.toThrow('Faça login');
    await expect(guard.canActivate(contexto(`sessao=${expired}`) as never)).rejects.toThrow('Faça login');
    vi.unstubAllEnvs();
  });
});
