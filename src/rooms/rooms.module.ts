import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomPricesModule } from 'src/room-prices/room-prices.module';
import { RoomHoldsModule } from 'src/room-holds/room-holds.module';
import { ImagesModule } from 'src/images/images.module';

@Module({
  imports: [RoomPricesModule, RoomHoldsModule, ImagesModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
