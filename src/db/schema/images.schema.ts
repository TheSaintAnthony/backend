import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { and, eq, isNull } from 'drizzle-orm';
import { entityTypes } from './entity-types.schema';

export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityTypeId: uuid('entity_type_id')
      .notNull()
      .references(() => entityTypes.id, { onDelete: 'restrict' }),
    entityId: uuid('entity_id').notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    altText: varchar('alt_text', { length: 255 }),
    caption: text('caption'),
    displayOrder: integer('display_order').default(0).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    entityIdx: index('idx_images_entity').on(
      table.entityTypeId,
      table.entityId,
    ),

    primaryIdx: index('idx_images_primary').on(
      table.entityTypeId,
      table.entityId,
      table.isPrimary,
    ),

    orderIdx: index('idx_images_order').on(
      table.entityTypeId,
      table.entityId,
      table.displayOrder,
    ),

    uniquePrimaryPerEntity: uniqueIndex('idx_one_primary_per_entity')
      .on(table.entityTypeId, table.entityId)
      .where(and(eq(table.isPrimary, true), isNull(table.deletedAt))),
  }),
);
