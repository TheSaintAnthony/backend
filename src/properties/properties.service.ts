import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException, DatabaseException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { eq, count } from 'drizzle-orm';
import { EditPropertyDto } from './dto/edit-property.dto';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { CacheService } from 'src/cache/cache.service';

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private cacheService: CacheService,
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

  async getProperties(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.properties);
    const total = totalResult.count;

    const data = await this.db
      .select()
      .from(schema.properties)
      .limit(limit)
      .offset(offset);

    return createPaginatedResponse(data, total, page, limit);
  }

  async getPropertyById(id: number) {
    const cacheKey = `property:${id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));

    if (!property) {
      throw new NotFoundException('Property', String(id));
    }

    await this.cacheService.set(cacheKey, property, 3600);
    return property;
  }

  async editProperty(id: number, data: EditPropertyDto) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);

    if (!property) {
      throw new NotFoundException('Property', String(id));
    }

    const { address, ...propertyData } = data;
    const addressId: number = property.addressId!;

    const [updateAddressResult] = await this.db
      .update(schema.addresses)
      .set({ ...address })
      .where(eq(schema.addresses.id, addressId))
      .returning();

    if (!updateAddressResult) {
      throw new NotFoundException('Address', String(addressId));
    }

    const result = await this.db
      .update(schema.properties)
      .set({ ...propertyData })
      .where(eq(schema.properties.id, id));

    await this.cacheService.del(`property:${id}`);
    return result;
  }

  async deleteProperty(id: number) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));

    if (!property) {
      throw new NotFoundException('Property', String(id));
    }

    const [result] = await this.db
      .delete(schema.properties)
      .where(eq(schema.properties.id, id))
      .returning();

    if (!result) {
      throw new DatabaseException('Failed to delete property', {
        propertyId: id,
        operation: 'delete',
      });
    }

    await this.cacheService.del(`property:${id}`);
  }
}
