import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { eq } from 'drizzle-orm';
import { EditPropertyDto } from './dto/edit-property.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  async createProperty(data: CreatePropertyDto) {
    const { address, ...propertyData } = data;

    const [createdAddress] = await this.db
      .insert(schema.addresses)
      .values({ ...address })
      .returning({ id: schema.addresses.id });

    return await this.db
      .insert(schema.properties)
      .values({
        addressId: createdAddress.id,
        ...propertyData,
      })
      .returning();
  }

  async getProperties() {
    return await this.db.select().from(schema.properties);
  }

  async getPropertyById(id: number) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return property;
  }

  async editProperty(id: number, data: EditPropertyDto) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const { address, ...propertyData } = data;
    const addressId: number = property.addressId!;

    const [updateAddressResult] = await this.db
      .update(schema.addresses)
      .set({ ...address })
      .where(eq(schema.addresses.id, addressId))
      .returning();

    if (!updateAddressResult) {
      throw new NotFoundException('Address not found or not updated');
    }

    return await this.db
      .update(schema.properties)
      .set({ ...propertyData })
      .where(eq(schema.properties.id, id));
  }

  async deleteProperty(id: number) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const [result] = await this.db
      .delete(schema.properties)
      .where(eq(schema.properties.id, id))
      .returning();

    if (!result) {
      throw new NotFoundException('Impossible to delete property');
    }
  }
}
