import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const httpException = exception instanceof HttpException ? exception : null;
    const status = httpException?.getStatus() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const detail = httpException?.getResponse();
    const message =
      typeof detail === 'string' ? detail : (detail as { message?: unknown })?.message;
    response.status(status).json({
      statusCode: status,
      message: message ?? 'Error interno del servidor',
      error: httpException?.name.replace('Exception', '') ?? 'Internal Server Error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
