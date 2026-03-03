import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let code = 'INTERNAL_SERVER_ERROR';
    let message = exception.message;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const res = exceptionResponse as Record<string, any>;
      code = res.code || this.statusToCode(statusCode);
      message = res.message || message;
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
      code = this.statusToCode(statusCode);
    }

    response.status(statusCode).json({
      code,
      message,
      statusCode,
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] || 'HTTP_ERROR';
  }
}
