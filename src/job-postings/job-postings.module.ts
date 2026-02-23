import { Module } from '@nestjs/common';
import { JobPostingsService } from './job-postings.service';
import { JobPostingsController } from './job-postings.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
import { FileStorageService } from 'src/services/file-storage.service';

@Module({
  imports: [AuthModule, UserRolesModule],
  providers: [JobPostingsService, FileStorageService],
  controllers: [JobPostingsController],
  exports: [JobPostingsService],
})
export class JobPostingsModule {}
