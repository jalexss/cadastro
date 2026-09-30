import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuditoriaMiddleware } from './auditoria/auditoria.middleware';
import { AuditoriaInterceptor } from './auditoria/auditoria.interceptor';
import { PersistenciaModule } from './database/persistencia.module';
import { CandidatosModule } from './candidatos/candidatos.module';
import { SaudeController } from './saude.controller';
import { FiltroExcecoes } from './common/filtro-excecoes.filter';
import { AutenticacaoModule } from './auth/autenticacao.module';

@Module({
  imports: [
    AuditoriaModule,
    PersistenciaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    CandidatosModule,
    AutenticacaoModule
  ],
  controllers: [SaudeController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditoriaInterceptor },
    { provide: APP_FILTER, useClass: FiltroExcecoes }
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuditoriaMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
