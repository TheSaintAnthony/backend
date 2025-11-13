import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyCleanupService {
  private readonly logger = new Logger(IdempotencyCleanupService.name);

  constructor(private idempotencyService: IdempotencyService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredKeys() {
    this.logger.log('Starting idempotency keys cleanup');
    try {
      await this.idempotencyService.cleanup();
      this.logger.log('Idempotency keys cleanup completed');
    } catch (error) {
      this.logger.error('Error during idempotency keys cleanup', error);
    }
  }
}
