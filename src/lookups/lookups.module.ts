import { Module } from '@nestjs/common';
import { LookupsController } from './lookups.controller';
import { LookupsService } from './lookups.service';
import { ImagesModule } from 'src/images/images.module';

@Module({
  imports: [ImagesModule],
  controllers: [LookupsController],
  providers: [LookupsService],
})
export class LookupsModule {}
