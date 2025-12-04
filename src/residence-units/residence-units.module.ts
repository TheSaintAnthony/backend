import { Module } from '@nestjs/common';
import { ResidenceUnitsService } from './residence-units.service';
import { ResidenceUnitsController } from './residence-units.controller';
import { ImagesModule } from 'src/images/images.module';
@Module({
  imports: [ImagesModule],
  providers: [ResidenceUnitsService],
  controllers: [ResidenceUnitsController],
  exports: [ResidenceUnitsService],
})
export class ResidenceUnitsModule {}
