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

  extractOrGenerate(
    headers: Record<string, string | string[] | undefined>,
  ): string {
    const correlationId = headers['x-correlation-id'];
    const requestId = headers['x-request-id'];

    if (typeof correlationId === 'string') return correlationId;
    if (typeof requestId === 'string') return requestId;

    return this.generate();
  }
}
