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
    // Skip detailed logging for file/image serving endpoints
    const isFileEndpoint =
      url.includes('/images/serve/') || url.includes('/images/entity/');
    return new Observable((subscriber) => {
      this.correlationIdService.run(correlationId, () => {
        // Log invocation first
        this.logger.log(`Invoking: [${method}] ${url}`);

        // Then log request body if present
        if (req.body && typeof req.body === 'object' && !isFileEndpoint) {
          const maskedBody = { ...req.body } as Record<string, unknown>;
          this.sensitiveFields.forEach((field) => {
            if (maskedBody[field]) maskedBody[field] = '*****';
          });
          this.log(`Request: ${JSON.stringify(maskedBody)}`);
        }

        // Then handle the request
        next
          .handle()
          .pipe(
            tap((response: unknown) => {
              // Skip detailed logging for file/image serving endpoints
              if (isFileEndpoint) {
                this.log('Response: [File Response]');
                return;
              }
              // Skip logging for file/stream responses (they contain circular references)
              if (response && typeof response === 'object') {
                // Check if response is an Express Response object (has methods like sendFile, setHeader, etc.)
                // These objects contain circular references and cannot be stringified
                if (
                  'sendFile' in response ||
                  ('setHeader' in response &&
                    'status' in response &&
                    'send' in response)
                ) {
                  this.log('Response: [File/Stream Response]');
                  return;
                }
                try {
                  // Use a replacer function to handle circular references
                  const seen = new WeakSet();
                  const maskedResponse = { ...response } as Record<
                    string,
                    unknown
                  >;
                  this.sensitiveFields.forEach((field) => {
                    if (maskedResponse[field]) maskedResponse[field] = '*****';
                  });
                  const jsonString = JSON.stringify(
                    maskedResponse,
                    (key, value) => {
                      if (typeof value === 'object' && value !== null) {
                        if (seen.has(value)) {
                          return '[Circular]';
                        }
                        seen.add(value);
                      }
                      return value;
                    },
                  );
                  this.log(`Response: ${jsonString}`);
                } catch (err) {
                  // Handle circular references or other serialization errors
                  this.log('Response: [Non-serializable object]');
                }
              } else if (response !== null && response !== undefined) {
                this.log(`Response: ${String(response)}`);
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
