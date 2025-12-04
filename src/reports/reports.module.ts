import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DrizzleModule } from 'src/db/drizzle.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [DrizzleModule, UserRolesModule, AuthModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
