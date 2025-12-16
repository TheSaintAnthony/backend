import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CloudBedsApiService } from './cloudbeds-api.service';

@Injectable()
export class CloudBedsSyncService {
  private readonly logger = new Logger(CloudBedsSyncService.name);
  private readonly isEnabled: boolean;

  constructor(
    @Optional() private cloudbedsApi?: CloudBedsApiService,
    @Optional() @InjectQueue('cloudbeds-sync') private syncQueue?: Queue,
  ) {
    this.isEnabled = process.env.CLOUDBEDS_ENABLED === 'true';
    
    if (this.isEnabled && (!this.cloudbedsApi || !this.syncQueue)) {
      this.logger.warn('CloudBeds is enabled but dependencies are missing');
    }
  }

  /**
   * Queue property sync - Safe to call even if disabled
   */
  async syncProperty(propertyId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    if (!this.isEnabled || !this.syncQueue) {
      return; // Silently skip if disabled
    }

    try {
      await this.syncQueue.add(
        'sync-property',
        { propertyId, operation },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    } catch (error) {
      // Log but don't throw - don't break existing functionality
      this.logger.error(`Failed to queue property sync: ${error}`);
    }
  }

  /**
   * Queue room sync - Safe to call even if disabled
   */
  async syncRoom(roomId: string, operation: 'create' | 'update' | 'delete'): Promise<void> {
    if (!this.isEnabled || !this.syncQueue) {
      return;
    }

    try {
      await this.syncQueue.add('sync-room', { roomId, operation });
    } catch (error) {
      this.logger.error(`Failed to queue room sync: ${error}`);
    }
  }

  /**
   * Queue availability sync - Safe to call even if disabled
   */
  async syncAvailability(roomId: string, dateRange: { start: Date; end: Date }): Promise<void> {
    if (!this.isEnabled || !this.syncQueue) {
      return;
    }

    try {
      await this.syncQueue.add('sync-availability', {
        roomId,
        dateRange: {
          start: dateRange.start.toISOString(),
          end: dateRange.end.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to queue availability sync: ${error}`);
    }
  }

  /**
   * Queue reservation sync to CloudBeds - Safe to call even if disabled
   */
  async syncReservationToCloudBeds(reservationId: string): Promise<void> {
    if (!this.isEnabled || !this.syncQueue) {
      return;
    }

    try {
      await this.syncQueue.add('sync-reservation-to-cloudbeds', {
        reservationId,
      });
    } catch (error) {
      this.logger.error(`Failed to queue reservation sync: ${error}`);
    }
  }
}

