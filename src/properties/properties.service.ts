import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { NotFoundException, DatabaseException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { eq, count, inArray, sql, or } from 'drizzle-orm';
import { EditPropertyDto } from './dto/edit-property.dto';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { CacheService } from 'src/cache/cache.service';
import { ImagesService } from 'src/images/images.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { ActivityPropertyService } from 'src/activity-property/activity-property.service';
@Injectable()
export class PropertiesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private cacheService: CacheService,
    private imagesService: ImagesService,
    @Inject(forwardRef(() => RoomsService))
    private roomsService: RoomsService,
    private activityPropertyService: ActivityPropertyService,
  ) {}
  async createProperty(data: CreatePropertyDto) {
    const { address, images, ...propertyData } = data;
    const [createdAddress] = await this.db
      .insert(schema.addresses)
      .values({ ...address })
      .returning({ id: schema.addresses.id });
    const [createdProperty] = await this.db
      .insert(schema.properties)
      .values({
        addressId: createdAddress.id,
        ...propertyData,
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'property',
          entityId: createdProperty.id,
          ...img,
        })),
      );
    }
    return this.getPropertyById(createdProperty.id);
  }
  async getProperties(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.properties);
    const total = totalResult.count;
    const data = await this.db.query.properties.findMany({
      limit,
      offset,
      with: {
        address: true,
      },
    });
    const propertyIds = data.map((property) => property.id);
    const allImages = propertyIds.length > 0
      ? await this.imagesService.getImagesByMultipleEntities(
          'property',
          propertyIds,
        )
      : [];
    const imagesByPropertyId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByPropertyId.get(image.entityId) || [];
      existing.push(image);
      imagesByPropertyId.set(image.entityId, existing);
    }
    const propertiesWithImages = data.map((property) => ({
      ...property,
      images: imagesByPropertyId.get(property.id) || [],
    }));
    return createPaginatedResponse(propertiesWithImages, total, page, limit);
  }
  async getPropertyById(id: string) {
    const cacheKey = `property:${id}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const property = await this.db.query.properties.findFirst({
      where: eq(schema.properties.id, id),
      with: {
        address: true,
      },
    });
    if (!property) {
      throw new NotFoundException('Property', id);
    }
    const images = await this.imagesService.getImagesByEntity('property', id);
    const propertyWithImages = { ...property, images };
    await this.cacheService.set(cacheKey, propertyWithImages, 3600);
    return propertyWithImages;
  }
  async getPropertyWithDetails(
    id: string,
    includeRooms = true,
    includeActivities = true,
  ) {
    const cacheKey = `property:${id}:details:${includeRooms}:${includeActivities}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;
    const property = await this.getPropertyById(id);
    const [rooms, activities] = await Promise.all([
      includeRooms ? this.getPropertyRooms(id) : Promise.resolve([]),
      includeActivities ? this.getPropertyActivities(id) : Promise.resolve([]),
    ]);
    const result = {
      ...property,
      rooms: includeRooms ? rooms : undefined,
      activities: includeActivities ? activities : undefined,
    };
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
  async getPropertyBySlug(slug: string) {
    let property = await this.db.query.properties.findFirst({
      where: eq(schema.properties.id, slug),
      with: {
        address: true,
      },
    });
    if (!property) {
      const properties = await this.db
        .select()
        .from(schema.properties)
        .where(
          sql`LOWER(REPLACE(${schema.properties.name}, ' ', '-')) = ${slug.toLowerCase()}`,
        )
        .limit(1);
      if (properties.length > 0) {
        property = await this.db.query.properties.findFirst({
          where: eq(schema.properties.id, properties[0].id),
          with: {
            address: true,
          },
        });
      }
    }
    if (!property) {
      throw new NotFoundException('Property', slug);
    }
    return this.getPropertyWithDetails(property.id, true, true);
  }
  async getPropertyRooms(propertyId: string) {
    const response = await this.roomsService.getRoomsByProperty(propertyId, {
      page: 1,
      limit: 100,
    });
    return response.data;
  }
  async getPropertyActivities(propertyId: string) {
    const activityProperties =
      await this.activityPropertyService.getActivityPropertiesByProperty(
        propertyId,
      );
    if (activityProperties.length === 0) {
      return [];
    }
    const activityIds = activityProperties.map((ap) => ap.activityId);
    if (activityIds.length === 0) {
      return [];
    }
    const activities = await this.db
      .select()
      .from(schema.activities)
      .where(inArray(schema.activities.id, activityIds));
    return activities.map((activity) => ({
      id: activity.id,
      name: activity.name || '',
      description: activity.description || '',
    }));
  }
  async editProperty(id: string, data: EditPropertyDto) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);
    if (!property) {
      throw new NotFoundException('Property', id);
    }
    const { address, images, ...propertyData } = data;
    const addressId: string = property.addressId!;
    if (address) {
      const [updateAddressResult] = await this.db
        .update(schema.addresses)
        .set({ ...address })
        .where(eq(schema.addresses.id, addressId))
        .returning();
      if (!updateAddressResult) {
        throw new NotFoundException('Address', String(addressId));
      }
    }
    await this.db
      .update(schema.properties)
      .set({ ...propertyData })
      .where(eq(schema.properties.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'property',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'property',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    await this.cacheService.del(`property:${id}`);
    return this.getPropertyById(id);
  }
  async deleteProperty(id: string) {
    const [property] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id));
    if (!property) {
      throw new NotFoundException('Property', id);
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
