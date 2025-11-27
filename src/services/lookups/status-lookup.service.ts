import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from 'src/db/schema';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class StatusLookupService implements OnModuleInit {
  private reservationStatusCache = new Map<string, string>();
  private invoiceStatusCache = new Map<string, string>();
  private invoiceTypeCache = new Map<string, string>();
  private paymentStatusCache = new Map<string, string>();

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private cacheService: CacheService,
  ) {}

  async onModuleInit() {
    await this.loadStatuses();
  }

  private async loadStatuses() {
    try {
      const [reservationStatuses, invoiceStatuses, invoiceTypes, paymentStatuses] =
        await Promise.all([
          this.db.select().from(schema.reservationStatus),
          this.db.select().from(schema.invoiceStatus),
          this.db.select().from(schema.invoiceTypes),
          this.db.select().from(schema.paymentStatus),
        ]);

      for (const status of reservationStatuses) {
        this.reservationStatusCache.set(status.name, status.id);
      }

      for (const status of invoiceStatuses) {
        this.invoiceStatusCache.set(status.name, status.id);
      }

      for (const type of invoiceTypes) {
        this.invoiceTypeCache.set(type.name, type.id);
      }

      for (const status of paymentStatuses) {
        this.paymentStatusCache.set(status.name, status.id);
      }
    } catch (error) {
      throw error;
    }
  }

  getReservationStatusId(name: string): string {
    const id = this.reservationStatusCache.get(name);
    if (!id) {
      throw new Error(`Reservation status '${name}' not found`);
    }
    return id;
  }

  getInvoiceStatusId(name: string): string {
    const id = this.invoiceStatusCache.get(name);
    if (!id) {
      throw new Error(`Invoice status '${name}' not found`);
    }
    return id;
  }

  getInvoiceTypeId(name: string): string {
    const id = this.invoiceTypeCache.get(name);
    if (!id) {
      throw new Error(
        `Invoice type '${name}' not found. Available types: ${Array.from(this.invoiceTypeCache.keys()).join(', ')}`,
      );
    }
    return id;
  }

  async getPaymentStatusId(name: string): Promise<string> {
    const id = this.paymentStatusCache.get(name);
    if (!id) {
      // Reload cache in case status was added
      await this.loadStatuses();
      const retryId = this.paymentStatusCache.get(name);
      if (!retryId) {
        throw new Error(`Payment status '${name}' not found`);
      }
      return retryId;
    }
    return id;
  }
}
