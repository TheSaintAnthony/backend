import { Module } from '@nestjs/common';
import { ActivityPropertyService } from './activity-property.service';
import { ActivityPropertyController } from './activity-property.controller';
@Module({
  providers: [ActivityPropertyService],
  controllers: [ActivityPropertyController],
  exports: [ActivityPropertyService],
})
export class ActivityPropertyModule {}
