import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateAddressDto, EditAddressDto } from './dto';
import { eq } from 'drizzle-orm';

@Injectable()
export class AddressesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createAddress(data: CreateAddressDto) {
    return await this.db
      .insert(schema.addresses)
      .values({ ...data })
      .returning();
  }

  async getAddresses() {
    return await this.db.select().from(schema.addresses);
  }

  async getAddressById(id: string) {
    const [address] = await this.db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.id, id));

    if (!address) {
      throw new NotFoundException('Address', id);
    }

    return address;
  }

  async editAddress(id: string, data: EditAddressDto) {
    const [address] = await this.db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.id, id));

    if (!address) {
      throw new NotFoundException('Address', id);
    }

    return this.db
      .update(schema.addresses)
      .set({
        ...data,
      })
      .where(eq(schema.addresses.id, id));
  }

  async deleteAddress(id: string) {
    const [address] = await this.db
      .select()
      .from(schema.addresses)
      .where(eq(schema.addresses.id, id));

    if (!address) {
      throw new NotFoundException('Address', id);
    }

    return await this.db
      .delete(schema.addresses)
      .where(eq(schema.addresses.id, id));
  }
}
