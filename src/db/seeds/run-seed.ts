import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';
import { seedStaticLookups } from './seed-static-lookups';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool, { schema });

  try {
    await seedStaticLookups(db);
  } catch (error) {
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
