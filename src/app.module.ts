import { Module } from '@nestjs/common';
import { DrizzleModule } from './db/drizzle.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './email/email.module';
import { LookupsModule } from './lookups/lookups.module';
import { AddressesModule } from './addresses/addresses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DrizzleModule,
    AuthModule,
    UsersModule,
    EmailModule,
    LookupsModule,
    AddressesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
