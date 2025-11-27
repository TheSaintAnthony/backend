import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException, NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { IInvoiceStrategy } from './interfaces/invoice-strategy.interface';

@Injectable()
export class InvoiceStrategyFactory {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  // Invoice provider factory methods removed - using Stripe only
  // TODO: Implement Stripe invoice strategy when StripeService is ready
  async getStrategy(providerId: string): Promise<IInvoiceStrategy> {
    throw new BadRequestException('Invoice provider factory not implemented - using Stripe directly');
  }

  async getStrategyByProviderName(
    providerName: string,
  ): Promise<IInvoiceStrategy> {
    throw new BadRequestException('Invoice provider factory not implemented - using Stripe directly');
  }

  async getDefaultStrategy(): Promise<IInvoiceStrategy> {
    throw new BadRequestException('Invoice provider factory not implemented - using Stripe directly');
  }
}
