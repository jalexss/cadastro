import { Global, Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaInterceptor } from './auditoria.interceptor';

@Global()
@Module({ providers: [AuditoriaService, AuditoriaInterceptor], exports: [AuditoriaService, AuditoriaInterceptor] })
export class AuditoriaModule {}
