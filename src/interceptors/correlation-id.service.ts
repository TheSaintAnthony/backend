import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<string>();

  /**
   * Run a function with a correlation ID context
   */
  run<T>(correlationId: string, callback: () => T): T {
    return this.asyncLocalStorage.run(correlationId, callback);
  }

  /**
   * Get the current correlation ID from the async context
   */
  get(): string | undefined {
    return this.asyncLocalStorage.getStore();
  }

  /**
   * Generate a new correlation ID
   */
  generate(): string {
    return randomUUID();
  }

  /**
   * Extract correlation ID from request headers or generate a new one
   */
  extractOrGenerate(headers: Record<string, any>): string {
    return (
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      this.generate()
    );
  }
}

