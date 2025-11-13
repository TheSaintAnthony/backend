import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { eq, and, gt, lt } from 'drizzle-orm';

export interface IdempotencyRecord {
  key: string;
  userId?: number;
  endpoint: string;
  requestBody: any;
  responseBody: any;
  statusCode: number;
}

@Injectable()
export class IdempotencyService {
  private readonly EXPIRY_HOURS = 24;

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findByKey(key: string) {
    const now = new Date();
    const [record] = await this.db
      .select()
      .from(schema.idempotencyKeys)
      .where(
        and(
          eq(schema.idempotencyKeys.key, key),
          gt(schema.idempotencyKeys.expiresAt, now),
        ),
      )
      .limit(1);

    return record || null;
  }

  async store(record: IdempotencyRecord) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.EXPIRY_HOURS);

    await this.db.insert(schema.idempotencyKeys).values({
      key: record.key,
      userId: record.userId,
      endpoint: record.endpoint,
      requestBody: record.requestBody,
      responseBody: record.responseBody,
      statusCode: record.statusCode,
      expiresAt,
    });
  }

  async cleanup() {
    const now = new Date();
    const result = await this.db
      .delete(schema.idempotencyKeys)
      .where(lt(schema.idempotencyKeys.expiresAt, now));
    return result;
  }
}
