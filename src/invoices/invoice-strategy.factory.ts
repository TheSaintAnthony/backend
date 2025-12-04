import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { IInvoiceStrategy } from './interfaces/invoice-strategy.interface';
@Injectable()
export class InvoiceStrategyFactory {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}
  getStrategy(_providerId: string): Promise<IInvoiceStrategy> {
    throw new BadRequestException(
      'Invoice provider factory not implemented - using Stripe directly',
    );
  }
  getStrategyByProviderName(_providerName: string): Promise<IInvoiceStrategy> {
    throw new BadRequestException(
      'Invoice provider factory not implemented - using Stripe directly',
    );
  }
  getDefaultStrategy(): Promise<IInvoiceStrategy> {
    throw new BadRequestException(
      'Invoice provider factory not implemented - using Stripe directly',
    );
  }
}
