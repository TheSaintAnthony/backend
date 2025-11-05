import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { SignUpDto } from 'src/auth/dto/auth.dto';

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
      .where(eq(schema.users.email, email));

    return user;
  }

  async createUser(data: Omit<SignUpDto, 'password'> & { password: string }) {
    const { address, password, ...userData } = data;

    const [createdAddress] = await this.db
      .insert(schema.addresses)
      .values({
        street: address.street,
        city: address.city,
        zip_code: address.zipCode,
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
    const result = await this.db
      .select({
        userId: schema.users.id,
      })
      .from(schema.users)
      .where(eq(schema.users.email, email));

    if (!result) {
      throw new NotFoundException('User not found');
    }

    const { userId } = result[0];

    return await this.db
      .update(schema.users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(schema.users.id, userId));
  }
}
