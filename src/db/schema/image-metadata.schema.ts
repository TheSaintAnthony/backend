import {
  pgTable,
  uuid,
  integer,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { images } from './images.schema';

export const imageMetadata = pgTable('image_metadata', {
  imageId: uuid('image_id')
    .primaryKey()
    .references(() => images.id, { onDelete: 'cascade' }),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  mimeType: varchar('mime_type', { length: 50 }),
  originalFilename: varchar('original_filename', { length: 255 }),
  storageProvider: varchar('storage_provider', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
