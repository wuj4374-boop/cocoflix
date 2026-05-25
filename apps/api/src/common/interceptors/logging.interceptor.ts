import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { WinstonLoggerService } from '../logger/winston-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: WinstonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = request;
    const userAgent = request.get('user-agent') || '';
    const ip = request.ip;
    const now = Date.now();

    this.logger.log(
      `${method} ${url} - ${userAgent} - ${ip}`,
      'Request',
    );

    if (Object.keys(query).length > 0) {
      this.logger.debug(`Query: ${JSON.stringify(query)}`, 'Request');
    }

    if (Object.keys(params).length > 0) {
      this.logger.debug(`Params: ${JSON.stringify(params)}`, 'Request');
    }

    if (method !== 'GET' && body && Object.keys(body).length > 0) {
      // 脱敏处理密码等敏感信息
      const sanitizedBody = { ...body };
      if (sanitizedBody.password) sanitizedBody.password = '***';
      if (sanitizedBody.passwordHash) sanitizedBody.passwordHash = '***';
      this.logger.debug(`Body: ${JSON.stringify(sanitizedBody)}`, 'Request');
    }

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const delay = Date.now() - now;
        this.logger.log(
          `${method} ${url} ${response.statusCode} - ${delay}ms`,
          'Response',
        );
      }),
    );
  }
}
