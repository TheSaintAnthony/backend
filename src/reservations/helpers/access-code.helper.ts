import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { eq, and, isNull, count } from 'drizzle-orm';

/**
 * Generates a random 6-digit access code
 */
export function generateAccessCode(): number {
  return Math.floor(100000 + Math.random() * 900000);
}

/**
 * Generates a unique access code for a reservation room
 * Ensures the code doesn't conflict with existing codes for the same date range
 */
export async function generateUniqueAccessCode(
  checkIn: string,
  checkOut: string,
  db: NodePgDatabase<typeof schema>,
  usedCodesInBatch?: Set<number>,
): Promise<number> {
  let code = generateAccessCode();
  let exists = true;
  let attempts = 0;
  const maxAttempts = 1000;

  while (exists && attempts < maxAttempts) {
    const isUsedInBatch = usedCodesInBatch?.has(code) || false;

    if (!isUsedInBatch) {
      const [result] = await db
        .select({ count: count() })
        .from(schema.reservationRooms)
        .where(
          and(
            eq(schema.reservationRooms.accessCode, code),
            eq(schema.reservationRooms.checkIn, checkIn),
            eq(schema.reservationRooms.checkOut, checkOut),
            isNull(schema.reservationRooms.deletedAt),
          ),
        );
      exists = result.count > 0;
    } else {
      exists = true;
    }

    if (exists) {
      code = generateAccessCode();
      attempts++;
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error(
      `Failed to generate unique access code after ${maxAttempts} attempts for dates ${checkIn} to ${checkOut}`,
    );
  }

  return code;
}
