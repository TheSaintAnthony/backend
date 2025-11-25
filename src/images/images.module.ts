import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { FileStorageService } from 'src/services/file-storage.service';

@Module({
  providers: [ImagesService, FileStorageService],
  controllers: [ImagesController],
  exports: [ImagesService],
})
export class ImagesModule {}
