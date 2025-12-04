import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthenticatedRequest } from 'src/auth/interfaces';
import { CacheService } from 'src/cache/cache.service';
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private cacheService: CacheService) {}
  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.method !== 'GET') {
      return next.handle();
    }
    const cacheKey = this.generateCacheKey(request);
    const cachedResponse = await this.cacheService.get<unknown>(cacheKey);
    if (cachedResponse !== null) {
      return of(cachedResponse);
    }
    return next.handle().pipe(
      tap((data: unknown) => {
        void this.cacheService.set(cacheKey, data, 300);
      }),
    );
  }
  private generateCacheKey(request: AuthenticatedRequest): string {
    const { url, query } = request;
    const queryString = Object.keys(query as Record<string, unknown>).length
      ? `:${JSON.stringify(query)}`
      : '';
    return `http:${url}${queryString}`;
  }
}
