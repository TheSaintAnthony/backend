import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeWebhookService } from './stripe-webhook.service';
import { Public } from 'src/decorators';
import type { Request } from 'express';
import Stripe from 'stripe';

@Public()
@Controller('stripe')
export class StripeController {
  private readonly logger = new Logger(StripeController.name);

  constructor(
    private stripeService: StripeService,
    private webhookService: StripeWebhookService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not set');
      throw new Error('Webhook secret not configured');
    }

    if (!req.rawBody) {
      this.logger.error('Raw body is missing');
      throw new Error('Raw body is required for webhook verification');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.verifyWebhookSignature(
        req.rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw error;
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.webhookService.handlePaymentIntentSucceeded(
          event.data.object,
        );
        break;
      case 'payment_intent.payment_failed':
        await this.webhookService.handlePaymentIntentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.webhookService.handlePaymentIntentCanceled(
          event.data.object,
        );
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }
}
