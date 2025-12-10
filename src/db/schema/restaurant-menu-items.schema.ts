import {
  pgTable,
  uuid,
  integer,
  varchar,
  text,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core';
import { restaurantMenus } from './restaurant-menus.schema';
import { menuCategories } from './lookup-tables.schema';
export const restaurantMenuItems = pgTable('restaurant_menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  menuId: uuid('menu_id')
    .notNull()
    .references(() => restaurantMenus.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }),
  categoryId: uuid('category_id').references(() => menuCategories.id, {
    onDelete: 'set null',
  }),
  displayOrder: integer('display_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
