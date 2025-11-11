import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { SignUpDto } from 'src/auth/dto/auth.dto';
import { EditUserDto } from './dto';
import { UserRole } from 'src/constants';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findOneByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!user) {
      throw new NotFoundException('User not found');
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
      throw new NotFoundException('User not found');
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

  async getUserById(id: number) {
    const [user] = await this.db
      .select({
        id: schema.users.id,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
        deletedAt: schema.users.deletedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
      throw new NotFoundException('User not found');
    }

    const { userId } = result;

    return await this.db
      .update(schema.users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(schema.users.id, userId));
  }

  async editUser(id: number, data: EditUserDto) {
    const { address, ...userData } = data;

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const addressId: number = user.addressId!;
    const resultAddress = await this.db
      .update(schema.addresses)
      .set({ ...address })
      .where(eq(schema.addresses.id, addressId));

    console.log(resultAddress);

    return await this.db
      .update(schema.users)
      .set({ ...userData })
      .where(eq(schema.users.id, id));
  }

  async deleteUser(id: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async verifyUser(id: number) {
    return await this.db
      .update(schema.users)
      .set({ verifiedAt: new Date() })
      .where(eq(schema.users.id, id));
  }
}
