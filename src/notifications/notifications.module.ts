import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { DrizzleModule } from 'src/db/drizzle.module';

@Module({
  imports: [DrizzleModule, BullModule.registerQueue({ name: 'email' })],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
