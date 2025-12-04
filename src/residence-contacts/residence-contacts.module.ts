import { Module } from '@nestjs/common';
import { ResidenceContactsService } from './residence-contacts.service';
import { ResidenceContactsController } from './residence-contacts.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
@Module({
  imports: [AuthModule, UserRolesModule],
  providers: [ResidenceContactsService],
  controllers: [ResidenceContactsController],
  exports: [ResidenceContactsService],
})
export class ResidenceContactsModule {}
