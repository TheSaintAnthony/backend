import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
import { QueuesModule } from 'src/queues/queues.module';

@Module({
  imports: [AuthModule, UserRolesModule, QueuesModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
