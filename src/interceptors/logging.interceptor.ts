/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { AuthenticatedRequest } from 'src/auth/interfaces';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private readonly sensitiveFields = [
    'password',
    'access-token',
    'passwordHash',
    'accessToken',
  ];

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = req;

    if (req.body) {
      const maskedBody = { ...req.body };
      this.sensitiveFields.forEach((field) => {
        if (maskedBody[field]) maskedBody[field] = '*****';
      });
      this.logger.log(`Request: ${JSON.stringify(maskedBody)}`);
    }

    this.logger.log(`Invoking: [${method}] ${url}`);

    return next.handle().pipe(
      tap((response) => {
        const maskedResponse = { ...response };
        this.sensitiveFields.forEach((field) => {
          if (maskedResponse[field]) maskedResponse[field] = '*****';
        });
        this.logger.log(`Response: ${JSON.stringify(maskedResponse)}`);
      }),
      catchError((err) => {
        let errorResponse: any;

        if (err instanceof HttpException) {
          errorResponse = err.getResponse();
          if (typeof errorResponse === 'object') {
            errorResponse = this.maskSensitive(errorResponse);
          }
        } else {
          errorResponse = { message: err.message || err };
        }

        this.logger.error(`Error: ${JSON.stringify(errorResponse)}`, err.stack);

        return throwError(() => err);
      }),
    );
  }

  private maskSensitive(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskSensitive(item));
    } else if (obj && typeof obj === 'object') {
      const masked = { ...obj };
      this.sensitiveFields.forEach((field) => {
        if (masked[field]) masked[field] = '*****';
      });
      Object.keys(masked).forEach((key) => {
        if (typeof masked[key] === 'object') {
          masked[key] = this.maskSensitive(masked[key]);
        }
      });
      return masked;
    }
    return obj;
  }
}
