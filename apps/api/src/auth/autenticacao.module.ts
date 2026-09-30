import { Module } from '@nestjs/common';
import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';
import { SessaoGuard } from './sessao.guard';
import { AplicacaoSeeder } from './aplicacao.seeder';

@Module({ controllers: [AutenticacaoController], providers: [AutenticacaoService, SessaoGuard, AplicacaoSeeder] })
export class AutenticacaoModule {}
