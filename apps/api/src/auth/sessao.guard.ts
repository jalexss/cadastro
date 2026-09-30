import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify } from 'jose';
import { parse } from 'cookie';
import { Request } from 'express';
import { AuditoriaService } from '../auditoria/auditoria.service';

export interface RequisicaoAutenticada extends Request {
  recrutador?: { id: string; email: string };
}

@Injectable()
export class SessaoGuard implements CanActivate {
  constructor(private readonly auditoria: AuditoriaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token = parse(request.headers.cookie ?? '').sessao;
    try {
      if (!token) throw new Error('missing-session');
      const { payload } = await jwtVerify(token, segredoJwt(), { algorithms: ['HS256'] });
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') throw new Error('invalid-session');
      request.recrutador = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      this.auditoria.registrar('auth.protecao_negada', { metodo: request.method, rota: request.route?.path ?? 'rota-protegida' });
      throw new UnauthorizedException('Faça login para consultar os candidatos.');
    }
  }
}

export function segredoJwt(): Uint8Array {
  const value = process.env.JWT_SECRET ?? '';
  const secret = new TextEncoder().encode(value);
  if (secret.byteLength < 32) throw new Error('JWT_SECRET deve conter pelo menos 32 bytes aleatórios.');
  return secret;
}
