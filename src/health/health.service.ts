import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { sql } from 'drizzle-orm';
import * as nodemailer from 'nodemailer';
import { PaypalService } from 'src/payments/paypal/paypal.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private paypalService: PaypalService,
  ) {}

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

    const isPaypalUp = await this.paypalService.checkConnection();
    dependencies.paypal = isPaypalUp ? 'OK' : 'ERROR';

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
