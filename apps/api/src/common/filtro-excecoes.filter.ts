import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Catch()
export class FiltroExcecoes implements ExceptionFilter {
  constructor(private readonly auditoria: AuditoriaService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof payload === 'string' ? payload : typeof payload === 'object' && payload && 'message' in payload
      ? (payload as { message: unknown }).message
      : status >= 500 ? 'Ocorreu um erro interno. Tente novamente.' : 'Não foi possível processar a solicitação.';
    if (status >= 500) this.auditoria.registrar('http.erro', { status, metodo: request.method, rota: request.route?.path ?? request.path, tipo: exception instanceof Error ? exception.name : 'Erro' });
    response.status(status).json({ statusCode: status, message, requestId: response.getHeader('x-request-id') });
  }
}
