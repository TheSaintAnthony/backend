import * as schema from '../../db/schema';

export type LookupTable =
  | typeof schema.amenities
  | typeof schema.roomTypes
  | typeof schema.highlights
  | typeof schema.reservationStatus
  | typeof schema.invoiceStatus
  | typeof schema.occurrenceStatus
  | typeof schema.roles
  | typeof schema.paymentStatus
  | typeof schema.paymentMethods
  | typeof schema.activities
  | typeof schema.activityCategories;
