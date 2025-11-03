import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DB_PROVIDER = 'DB_PROVIDER';

@Global()
@Module({
  providers: [
    {
      provide: DB_PROVIDER,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          // TODO: add connectionTimeoutMilis, idleTimeoutMilis, max pool size, ssl
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DB_PROVIDER],
})
export class DrizzleModule {}
