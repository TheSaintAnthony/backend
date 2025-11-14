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

  async getStrategy(providerId: number): Promise<IInvoiceStrategy> {
    const [provider] = await this.db
      .select()
      .from(schema.invoiceProviders)
      .where(eq(schema.invoiceProviders.id, providerId));

    if (!provider) {
      throw new NotFoundException('Invoice provider', String(providerId));
    }

    if (!provider.isActive) {
      throw new BadRequestException(
        `Invoice provider '${provider.name}' is not currently active`,
      );
    }

    switch (provider.name.toUpperCase()) {
      default:
        throw new BadRequestException(
          `Invoice provider '${provider.name}' is not currently supported. Please implement a strategy for this provider.`,
        );
    }
  }

  async getStrategyByProviderName(
    providerName: string,
  ): Promise<IInvoiceStrategy> {
    const [provider] = await this.db
      .select()
      .from(schema.invoiceProviders)
      .where(eq(schema.invoiceProviders.name, providerName));

    if (!provider) {
      throw new NotFoundException('Invoice provider', providerName);
    }

    return this.getStrategy(provider.id);
  }

  async getDefaultStrategy(): Promise<IInvoiceStrategy> {
    const [provider] = await this.db
      .select()
      .from(schema.invoiceProviders)
      .where(eq(schema.invoiceProviders.isActive, true))
      .limit(1);

    if (!provider) {
      throw new NotFoundException(
        'No active invoice provider found. Please configure an invoicing system.',
      );
    }

    return this.getStrategy(provider.id);
  }
}

