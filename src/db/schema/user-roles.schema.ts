import { pgTable, uuid, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { roles } from './lookup-tables.schema';

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    uniqueUserRole: uniqueIndex('unique_user_role').on(
      table.userId,
      table.roleId,
    ),
  }),
);
