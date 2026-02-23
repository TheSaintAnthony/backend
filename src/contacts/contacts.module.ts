import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserRolesModule } from 'src/user-roles/user-roles.module';
import { QueuesModule } from 'src/queues/queues.module';

@Module({
  imports: [AuthModule, UserRolesModule, QueuesModule],
  providers: [ContactsService],
  controllers: [ContactsController],
  exports: [ContactsService],
})
export class ContactsModule {}
