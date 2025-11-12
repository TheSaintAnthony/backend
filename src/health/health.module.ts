import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { PaypalModule } from 'src/payments/paypal/paypal.module';

@Module({
  imports: [PaypalModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
