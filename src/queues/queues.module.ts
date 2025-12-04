import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailModule } from 'src/email/email.module';
import { EmailConsumer } from './email.processor';
@Module({
  imports: [BullModule.registerQueue({ name: 'email' }), EmailModule],
  providers: [EmailConsumer],
  exports: [BullModule, EmailConsumer],
})
export class QueuesModule {}
