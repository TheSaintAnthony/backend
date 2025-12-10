import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../schema';
import { ReservationStatus } from '../../constants/reservation-status.enum';
import { PaymentStatus } from '../../constants/payment-status.enum';
import { InvoiceStatus } from '../../constants/invoice-status.enum';
import { UserRole } from '../../constants/user-role.enum';

export async function seedStaticLookups(db: NodePgDatabase<typeof schema>) {
  console.log('Seeding static lookup tables...');

  // Seed Reservation Status
  const reservationStatuses = Object.values(ReservationStatus);
  for (const status of reservationStatuses) {
    const existing = await db
      .select()
      .from(schema.reservationStatus)
      .where(eq(schema.reservationStatus.name, status))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.reservationStatus).values({
        name: status,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${reservationStatuses.length} reservation statuses`);

  // Seed Payment Status
  const paymentStatuses = Object.values(PaymentStatus);
  for (const status of paymentStatuses) {
    const existing = await db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, status))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.paymentStatus).values({
        name: status,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${paymentStatuses.length} payment statuses`);

  // Seed Invoice Status
  const invoiceStatuses = Object.values(InvoiceStatus);
  for (const status of invoiceStatuses) {
    const existing = await db
      .select()
      .from(schema.invoiceStatus)
      .where(eq(schema.invoiceStatus.name, status))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.invoiceStatus).values({
        name: status,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${invoiceStatuses.length} invoice statuses`);

  // Seed Invoice Types
  const invoiceTypes = [
    { name: 'Booking', description: 'Invoice for room booking' },
    { name: 'Service', description: 'Invoice for additional services' },
    { name: 'Refund', description: 'Refund invoice' },
  ];
  for (const type of invoiceTypes) {
    const existing = await db
      .select()
      .from(schema.invoiceTypes)
      .where(eq(schema.invoiceTypes.name, type.name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.invoiceTypes).values({
        ...type,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${invoiceTypes.length} invoice types`);

  // Seed Occurrence Status
  const occurrenceStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  for (const status of occurrenceStatuses) {
    const existing = await db
      .select()
      .from(schema.occurrenceStatus)
      .where(eq(schema.occurrenceStatus.name, status))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.occurrenceStatus).values({
        name: status,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${occurrenceStatuses.length} occurrence statuses`);

  // Seed Roles
  const roles = Object.values(UserRole);
  for (const role of roles) {
    const existing = await db
      .select()
      .from(schema.roles)
      .where(eq(schema.roles.name, role))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.roles).values({
        name: role,
        isSystemManaged: true,
      });
    }
  }
  console.log(`✓ Seeded ${roles.length} roles`);

  console.log('✓ Static lookup tables seeded successfully!');
}
