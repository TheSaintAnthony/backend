import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateUserRoleDto } from './dto';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class UserRolesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createUserRole(data: CreateUserRoleDto) {
    return await this.db
      .insert(schema.userRoles)
      .values({ ...data })
      .returning();
  }

  async getUserRoles() {
    return await this.db.select().from(schema.userRoles);
  }

  async getUserRoleById(id: number) {
    const [userRole] = await this.db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.id, id));

    if (!userRole) {
      throw new NotFoundException('User role', String(id));
    }

    return userRole;
  }

  async getUserRolesByUser(userId: number) {
    return await this.db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.userId, userId));
  }

  async deleteUserRole(id: number) {
    const [userRole] = await this.db
      .select()
      .from(schema.userRoles)
      .where(eq(schema.userRoles.id, id));

    if (!userRole) {
      throw new NotFoundException('User role', String(id));
    }

    return await this.db
      .delete(schema.userRoles)
      .where(eq(schema.userRoles.id, id))
      .returning();
  }

  async deleteUserRoleByUserAndRole(userId: number, roleId: number) {
    const [userRole] = await this.db
      .select()
      .from(schema.userRoles)
      .where(
        and(
          eq(schema.userRoles.userId, userId),
          eq(schema.userRoles.roleId, roleId),
        ),
      );

    if (!userRole) {
      throw new NotFoundException('User role', `${userId}-${roleId}`);
    }

    return await this.db
      .delete(schema.userRoles)
      .where(eq(schema.userRoles.id, userRole.id))
      .returning();
  }
}
