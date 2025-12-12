import { Module, forwardRef } from '@nestjs/common';
import { PricingEngineService } from './pricing-engine.service';
import { RoomsModule } from 'src/rooms/rooms.module';
import { PropertiesModule } from 'src/properties/properties.module';
import { PromoCodesModule } from 'src/promo-codes/promo-codes.module';

@Module({
  imports: [
    forwardRef(() => RoomsModule),
    forwardRef(() => PropertiesModule),
    PromoCodesModule,
  ],
  providers: [PricingEngineService],
  exports: [PricingEngineService],
})
export class PricingModule {}
