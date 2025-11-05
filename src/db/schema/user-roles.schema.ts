import { pgTable, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { roles } from './lookup-tables.schema';

export const userRoles = pgTable(
  'user_roles',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: integer('role_id')
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
