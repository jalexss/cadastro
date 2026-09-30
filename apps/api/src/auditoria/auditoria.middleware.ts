import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { contextoAuditoria } from './contexto-auditoria';

@Injectable()
export class AuditoriaMiddleware implements NestMiddleware {
  use(_request: Request, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    response.setHeader('x-request-id', requestId);
    contextoAuditoria.run({ requestId }, next);
  }
}
