import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationIdService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<string>();

  run<T>(correlationId: string, callback: () => T): T {
    return this.asyncLocalStorage.run(correlationId, callback);
  }

  get(): string | undefined {
    return this.asyncLocalStorage.getStore();
  }

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
