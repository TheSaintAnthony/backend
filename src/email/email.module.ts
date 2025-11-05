import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { EmailService } from './email.service';

@Module({
  imports: [ConfigModule, JwtModule.register({})],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
