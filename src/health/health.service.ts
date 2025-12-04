import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import Redis from 'ioredis';
@Injectable()
export class HealthService {
  private redisClient: Redis;
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
      password: process.env.REDIS_PASSWORD,
    });
  }
  async checkHealth() {
    const dependencies: Record<string, string> = {};
    try {
      await this.db.execute(sql`SELECT 1`);
      dependencies.database = 'OK';
    } catch {
      dependencies.database = 'ERROR';
    }
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'localhost',
        port: Number(process.env.MAIL_PORT) || 1025,
        secure: false,
      });
      await transporter.verify();
      dependencies.email = 'OK';
    } catch {
      dependencies.email = 'ERROR';
    }
    dependencies.stripe = 'OK';
    try {
      const pong = await this.redisClient.ping();
      dependencies.redis = pong === 'PONG' ? 'OK' : 'ERROR';
    } catch {
      dependencies.redis = 'ERROR';
    }
    const uptimeMs = process.uptime() * 1000;
    const uptime = `${Math.floor(uptimeMs / 3600000)}h${Math.floor((uptimeMs % 3600000) / 60000)}m`;
    return {
      status: Object.values(dependencies).every((v) => v === 'OK')
        ? 'OK'
        : 'ERROR',
      uptime: uptime,
      dependencies,
      checkedAt: new Date().toISOString(),
    };
  }
}
