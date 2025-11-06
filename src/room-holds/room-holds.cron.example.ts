import { Injectable, Logger } from '@nestjs/common';
import { RoomHoldsService } from './room-holds.service';

@Injectable()
export class RoomHoldsCronService {
  private readonly logger = new Logger(RoomHoldsCronService.name);

  constructor(private roomHoldsService: RoomHoldsService) {}

  async handleCron() {
    this.logger.log('Running cleanup for expired room holds...');
    const deletedCount = await this.roomHoldsService.cleanupExpiredHolds();
    this.logger.log(`Cleaned up ${deletedCount} expired room holds.`);
  }
}
