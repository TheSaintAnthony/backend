import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CloudBedsApiService } from './cloudbeds-api.service';
import { CloudBedsMapperService } from './cloudbeds-mapper.service';
import { CloudBedsSyncService } from './cloudbeds-sync.service';
import { CloudBedsController } from './cloudbeds.controller';
import { CloudBedsWebhookController } from './cloudbeds-webhook.controller';
import { CloudBedsWebhookService } from './cloudbeds-webhook.service';
import { CloudBedsSyncProcessor } from './processors/cloudbeds-sync.processor';
import { PropertiesModule } from '../properties/properties.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { AuthModule } from '../auth/auth.module';
import { StatusLookupService } from '../services/lookups/status-lookup.service';

@Global() // Make it global so it can be injected anywhere
@Module({
  imports: [
    // Always register queue - it's safe even if not used
    BullModule.registerQueue({
      name: 'cloudbeds-sync',
    }),
    AuthModule, // Required for AuthGuard in CloudBedsController
    PropertiesModule,
    RoomsModule,
    ReservationsModule,
  ],
  controllers: [
    // Always register controllers - they're safe when disabled
    // Services will handle the disabled state gracefully
    CloudBedsController,
    // Webhook controller only when enabled (needs to receive webhooks)
    ...(process.env.CLOUDBEDS_ENABLED === 'true' ? [CloudBedsWebhookController] : []),
  ],
  providers: [
    // Always provide services - they're safe when disabled
    CloudBedsApiService,
    CloudBedsMapperService,
    CloudBedsSyncService,
    CloudBedsWebhookService,
    StatusLookupService,
    // Only register processor if enabled
    ...(process.env.CLOUDBEDS_ENABLED === 'true' ? [CloudBedsSyncProcessor] : []),
  ],
  exports: [CloudBedsSyncService], // Export so it can be injected
})
export class CloudBedsModule {}

