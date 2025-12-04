import { Module } from '@nestjs/common';
import { RestaurantMenusService } from './restaurant-menus.service';
import { RestaurantMenusController } from './restaurant-menus.controller';
import { ImagesModule } from 'src/images/images.module';
@Module({
  imports: [ImagesModule],
  providers: [RestaurantMenusService],
  controllers: [RestaurantMenusController],
  exports: [RestaurantMenusService],
})
export class RestaurantMenusModule {}
