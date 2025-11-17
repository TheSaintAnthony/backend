import { uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { activities } from './activities.schema';
import { properties } from './properties.schema';

export const activityProperty = pgTable(
  'activity_property',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    activityId: uuid('activity_id')
      .notNull()
      .references(() => activities.id, { onDelete: 'cascade' }),
    propertyId: uuid('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    uniqueActivityPeoperty: uniqueIndex('unique_activity_property').on(
      table.activityId,
      table.propertyId,
    ),
  }),
);
