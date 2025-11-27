import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookService } from './stripe-webhook.service';
import { StatusLookupService } from 'src/services/lookups/status-lookup.service';

@Module({
  providers: [StripeService, StripeWebhookService, StatusLookupService],
  controllers: [StripeController],
  exports: [StripeService],
})
export class StripeModule {}
