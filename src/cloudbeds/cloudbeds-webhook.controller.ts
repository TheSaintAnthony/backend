import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { CloudBedsWebhookService } from './cloudbeds-webhook.service';

@Controller('webhooks/cloudbeds')
export class CloudBedsWebhookController {
  private readonly logger = new Logger(CloudBedsWebhookController.name);

  constructor(private webhookService: CloudBedsWebhookService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-cloudbeds-signature') signature?: string,
  ) {
    // Verify webhook signature if CloudBeds provides one
    if (process.env.CLOUDBEDS_WEBHOOK_SECRET && signature) {
      const isValid = await this.webhookService.verifySignature(payload, signature);
      if (!isValid) {
        this.logger.error('Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }
    }

    // Process webhook asynchronously (fire and forget)
    this.webhookService.processWebhook(payload).catch((error) => {
      this.logger.error('Error processing CloudBeds webhook:', error);
    });

    return { received: true };
  }
}

