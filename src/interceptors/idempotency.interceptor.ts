import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { IDEMPOTENT_KEY } from 'src/decorators/idempotent.decorator';
import { IdempotencyService } from 'src/services/idempotency/idempotency.service';
import { AuthenticatedRequest } from 'src/auth/interfaces';
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private idempotencyService: IdempotencyService,
  ) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const isIdempotent = this.reflector.get<boolean>(
      IDEMPOTENT_KEY,
      context.getHandler(),
    );
    if (!isIdempotent) {
      return next.handle();
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const idempotencyKey = request.headers['idempotency-key'] as
      | string
      | undefined;
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const existing = await this.idempotencyService.findByKey(idempotencyKey);
    if (existing) {
      if (existing.statusCode && existing.statusCode >= 400) {
        throw new ConflictException(
          'Request with this idempotency key failed previously',
        );
      }
      return of(existing.responseBody);
    }
    let statusCode = 200;
    return next.handle().pipe(
      tap((response: unknown) => {
        void this.idempotencyService.store({
          key: idempotencyKey,
          userId: request.user?.sub,
          endpoint: request.url,
          requestBody: request.body as Record<string, unknown>,
          responseBody: response,
          statusCode,
        });
      }),
      catchError((error: Error & { status?: number; name?: string }) => {
        statusCode = error.status || 500;
        const errorResponse = {
          statusCode,
          message: error.message,
          error: error.name,
        };
        void this.idempotencyService
          .store({
            key: idempotencyKey,
            userId: request.user?.sub,
            endpoint: request.url,
            requestBody: request.body as Record<string, unknown>,
            responseBody: errorResponse,
            statusCode,
          })
          .catch(() => {});
        return throwError(() => error);
      }),
    );
  }
}
