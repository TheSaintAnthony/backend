import { Module, forwardRef } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { ImagesModule } from 'src/images/images.module';
import { RoomsModule } from 'src/rooms/rooms.module';
import { ActivityPropertyModule } from 'src/activity-property/activity-property.module';
@Module({
  imports: [
    ImagesModule,
    forwardRef(() => RoomsModule),
    ActivityPropertyModule,
  ],
  providers: [PropertiesService],
  controllers: [PropertiesController],
  exports: [PropertiesService],
})
export class PropertiesModule {}
