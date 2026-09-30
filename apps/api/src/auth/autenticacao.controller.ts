import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { serialize } from 'cookie';
import { loginSchema } from '@cadastro/contratos';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AutenticacaoService } from './autenticacao.service';
import { RequisicaoAutenticada, SessaoGuard } from './sessao.guard';

@Controller('auth')
export class AutenticacaoController {
  constructor(private readonly autenticacao: AutenticacaoService) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async login(@Body(new ZodValidationPipe(loginSchema)) body: { email: string; senha: string }, @Res({ passthrough: true }) response: Response) {
    const { id, email, token } = await this.autenticacao.autenticar(body.email, body.senha);
    response.setHeader('Set-Cookie', serialize('sessao', token, {
      httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/api', maxAge: 8 * 60 * 60
    }));
    return { recrutador: { id, email } };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    this.autenticacao.encerrar();
    response.setHeader('Set-Cookie', serialize('sessao', '', {
      httpOnly: true, sameSite: 'lax', secure: process.env.COOKIE_SECURE === 'true', path: '/api', maxAge: 0
    }));
    return { encerrada: true };
  }

  @Get('sessao')
  @UseGuards(SessaoGuard)
  sessao(@Req() request: Request) {
    const recrutador = (request as RequisicaoAutenticada).recrutador!;
    return { recrutador };
  }
}
