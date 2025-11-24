import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException, UnauthorizedException } from 'src/filters';
import { eq, count } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { SignUpDto } from 'src/auth/dto/auth.dto';
import { EditUserDto } from './dto';
import { UserRole } from 'src/constants';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async getUsers(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.users);
    const total = totalResult.count;

    const usersRows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        addressId: schema.users.addressId,
        nif: schema.users.nif,
        companyName: schema.users.companyName,
        createdAt: schema.users.createdAt,
        verifiedAt: schema.users.verifiedAt,
        updatedAt: schema.users.updatedAt,
        deletedAt: schema.users.deletedAt,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .limit(limit)
      .offset(offset);

    // Group by user and aggregate roles
    const usersMap = new Map<string, any>();

    for (const row of usersRows) {
      if (!usersMap.has(row.id)) {
        usersMap.set(row.id, {
          id: row.id,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          addressId: row.addressId,
          nif: row.nif,
          companyName: row.companyName,
          createdAt: row.createdAt,
          verifiedAt: row.verifiedAt,
          updatedAt: row.updatedAt,
          deletedAt: row.deletedAt,
          roles: [],
        });
      }

      const user = usersMap.get(row.id)!;
      if (row.roleId && row.roleName) {
        user.roles.push({
          id: row.roleId,
          name: row.roleName,
        });
      }
    }

    const data = Array.from(usersMap.values());
    return createPaginatedResponse(data, total, page, limit);
  }


  async findOneByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      throw new UnauthorizedException(
        'Login failed. Incorrect login credentials.',
      );
    }

    const roles = await this.db
      .select({ name: schema.roles.name })
      .from(schema.roles)
      .leftJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, user.id));

    return {
      ...user,
      roles,
    };
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      throw new NotFoundException('User', email);
    }

    const roles = await this.db
      .select({ name: schema.roles.name })
      .from(schema.roles)
      .leftJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, user.id));

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      roles,
    };
  }

  async findByEmailOrNull(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      return null;
    }

    const roles = await this.db
      .select({ name: schema.roles.name })
      .from(schema.roles)
      .leftJoin(schema.userRoles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.userRoles.userId, user.id));

    const { passwordHash: _, ...safeUser } = user;
    return {
      ...safeUser,
      roles,
    };
  }

  async getUserById(id: string) {
    const userRows = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        addressId: schema.users.addressId,
        nif: schema.users.nif,
        companyName: schema.users.companyName,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        deletedAt: schema.users.deletedAt,
        roleId: schema.roles.id,
        roleName: schema.roles.name,
      })
      .from(schema.users)
      .leftJoin(schema.userRoles, eq(schema.userRoles.userId, schema.users.id))
      .leftJoin(schema.roles, eq(schema.userRoles.roleId, schema.roles.id))
      .where(eq(schema.users.id, id));

    if (!userRows || userRows.length === 0) {
      throw new NotFoundException('User', id);
    }

    // Aggregate roles into an array
    const user = userRows[0];
    const roles = userRows
      .filter((row) => row.roleId && row.roleName)
      .map((row) => ({
        id: row.roleId,
        name: row.roleName,
      }));

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      addressId: user.addressId,
      nif: user.nif,
      companyName: user.companyName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      roles,
    };
  }

  async createUser(data: Omit<SignUpDto, 'password'> & { password: string }) {
    const { address, password, ...userData } = data;

    const [createdAddress] = await this.db
      .insert(schema.addresses)
      .values({
        street: address.street,
        city: address.city,
        zipCode: address.zipCode,
        country: address.country,
      })
      .returning({ id: schema.addresses.id });

    const [createdUser] = await this.db
      .insert(schema.users)
      .values({
        ...userData,
        passwordHash: password,
        addressId: createdAddress.id,
      })
      .returning();

    const [role] = await this.db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.name, UserRole.USER));

    await this.db
      .insert(schema.userRoles)
      .values({ userId: createdUser.id, roleId: role.id });

    return createdUser;
  }

  async resetPassword(email: string, newPasswordHash: string) {
    const [result] = await this.db
      .select({
        userId: schema.users.id,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!result) {
      throw new NotFoundException('User', email);
    }

    const { userId } = result;

    return await this.db
      .update(schema.users)
      .set({
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  async editUser(id: string, data: EditUserDto) {
    const { address, ...userData } = data;

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new NotFoundException('User', id);
    }

    const addressId: string = user.addressId!;
    await this.db
      .update(schema.addresses)
      .set({ ...address })
      .where(eq(schema.addresses.id, addressId));

    return await this.db
      .update(schema.users)
      .set({ ...userData })
      .where(eq(schema.users.id, id));
  }

  async deleteUser(id: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new NotFoundException('User', id);
    }

    return await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async verifyUser(id: string) {
    return await this.db
      .update(schema.users)
      .set({ verifiedAt: new Date() })
      .where(eq(schema.users.id, id));
  }
}
