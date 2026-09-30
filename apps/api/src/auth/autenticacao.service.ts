import { Inject, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { hash, argon2id, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { SignJWT } from 'jose';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { Persistencia, PERSISTENCIA } from '../database/persistencia';
import { segredoJwt } from './sessao.guard';

@Injectable()
export class AutenticacaoService implements OnModuleInit {
  private senhaFalsaHash = '';

  constructor(
    @Inject(PERSISTENCIA) private readonly persistencia: Persistencia,
    private readonly auditoria: AuditoriaService
  ) {}

  async onModuleInit(): Promise<void> {
    segredoJwt();
    this.senhaFalsaHash = await hash(randomBytes(32), { type: argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  }

  async autenticar(email: string, senha: string): Promise<{ id: string; email: string; token: string }> {
    const recrutador = await this.persistencia.buscarRecrutadorPorEmail(email.trim().toLowerCase());
    const valida = await verify(recrutador?.senhaHash ?? this.senhaFalsaHash, senha).catch(() => false);
    if (!recrutador || !valida) {
      this.auditoria.registrar('auth.login', { resultado: 'negado' });
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    const token = await new SignJWT({ email: recrutador.email })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(recrutador.id)
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(segredoJwt());
    this.auditoria.registrar('auth.login', { resultado: 'aceito' });
    return { id: recrutador.id, email: recrutador.email, token };
  }

  encerrar(): void {
    this.auditoria.registrar('auth.logout');
  }
}
