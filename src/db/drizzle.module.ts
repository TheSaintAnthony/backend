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
          max: 100,
          min: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DB_PROVIDER],
})
export class DrizzleModule {}
