import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { SignUpDto } from 'src/auth/dto/auth.dto';
import { EditUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async findOne(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    return user || null;
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
