import { Module } from '@nestjs/common';
import { ResidencesService } from './residences.service';
import { ResidencesController } from './residences.controller';
import { ImagesModule } from 'src/images/images.module';
@Module({
  imports: [ImagesModule],
  providers: [ResidencesService],
  controllers: [ResidencesController],
  exports: [ResidencesService],
})
export class ResidencesModule {}
