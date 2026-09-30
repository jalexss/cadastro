import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { finalize, Observable } from 'rxjs';
import { AuditoriaService } from './auditoria.service';

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const inicio = process.hrtime.bigint();
    return next.handle().pipe(finalize(() => {
      const route = request.route?.path;
      this.auditoria.registrar('http.request', {
        metodo: request.method,
        rota: `${request.baseUrl}${typeof route === 'string' ? route : request.path}`,
        status: response.statusCode,
        duracaoMs: Number(process.hrtime.bigint() - inicio) / 1_000_000
      });
    }));
  }
}
