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
import { CorrelationIdService } from 'src/services/correlation-id.service';
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly sensitiveFields = [
    'password',
    'access-token',
    'passwordHash',
    'accessToken',
  ];
  constructor(private readonly correlationIdService: CorrelationIdService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const res = context.switchToHttp().getResponse<{
      setHeader: (key: string, value: string) => void;
    }>();
    const { method, url } = req;
    const correlationId = this.correlationIdService.extractOrGenerate(
      req.headers as Record<string, string | string[] | undefined>,
    );
    res.setHeader('X-Correlation-Id', correlationId);
    return new Observable((subscriber) => {
      this.correlationIdService.run(correlationId, () => {
        if (req.body && typeof req.body === 'object') {
          const maskedBody = { ...req.body } as Record<string, unknown>;
          this.sensitiveFields.forEach((field) => {
            if (maskedBody[field]) maskedBody[field] = '*****';
          });
          this.log(`Request: ${JSON.stringify(maskedBody)}`);
        }
        this.logger.log(`Invoking: [${method}] ${url}`);
        next
          .handle()
          .pipe(
            tap((response: unknown) => {
              if (response && typeof response === 'object') {
                const maskedResponse = { ...response } as Record<
                  string,
                  unknown
                >;
                this.sensitiveFields.forEach((field) => {
                  if (maskedResponse[field]) maskedResponse[field] = '*****';
                });
                this.log(`Response: ${JSON.stringify(maskedResponse)}`);
              }
            }),
            catchError((err: unknown) => {
              let errorResponse: unknown;
              if (err instanceof HttpException) {
                errorResponse = err.getResponse();
                if (typeof errorResponse === 'object') {
                  errorResponse = this.maskSensitive(errorResponse);
                }
              } else if (err instanceof Error) {
                errorResponse = { message: err.message };
              } else {
                errorResponse = { message: String(err) };
              }
              const error = err instanceof Error ? err : new Error(String(err));
              this.logError(
                `Error: ${JSON.stringify(errorResponse)}`,
                error.stack,
              );
              return throwError(() => error);
            }),
          )
          .subscribe(subscriber);
      });
    });
  }
  private log(message: string): void {
    const correlationId = this.correlationIdService.get();
    const white = '\x1b[37m';
    const reset = '\x1b[0m';
    this.logger.log(
      `${white}${message}; correlationId: ${correlationId}${reset}`,
    );
  }
  private logError(message: string, trace?: string): void {
    const correlationId = this.correlationIdService.get();
    this.logger.error(`${message}; correlationId: ${correlationId}`, trace);
  }
  private maskSensitive(obj: unknown): unknown {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.maskSensitive(item));
    } else if (obj && typeof obj === 'object') {
      const masked = { ...obj } as Record<string, unknown>;
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
