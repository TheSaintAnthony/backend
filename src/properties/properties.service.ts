import { Inject, Injectable, forwardRef, Optional } from '@nestjs/common';
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
import { ImagesService } from 'src/images/images.service';
import { RoomsService } from 'src/rooms/rooms.service';
import { ActivityPropertyService } from 'src/activity-property/activity-property.service';
import { CloudBedsSyncService } from '../cloudbeds/cloudbeds-sync.service';
@Injectable()
export class PropertiesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
    @Inject(forwardRef(() => RoomsService))
    private roomsService: RoomsService,
    private activityPropertyService: ActivityPropertyService,
    @Optional() private cloudbedsSyncService?: CloudBedsSyncService,
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
    const property = await this.getPropertyById(createdProperty.id);
    
    // CloudBeds sync - fire and forget, safe check
    if (this.cloudbedsSyncService) {
      this.cloudbedsSyncService.syncProperty(property.id, 'create').catch((error) => {
        // Silently log - don't break the main flow
      });
    }
    
    return property;
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
    const allImages =
      propertyIds.length > 0
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
    return { ...property, images };
  }
  async getPropertyWithDetails(
    id: string,
    includeRooms = true,
    includeActivities = true,
  ) {
    const property = await this.getPropertyById(id);
    const [rooms, activities] = await Promise.all([
      includeRooms ? this.getPropertyRooms(id) : Promise.resolve([]),
      includeActivities ? this.getPropertyActivities(id) : Promise.resolve([]),
    ]);
    return {
      ...property,
      rooms: includeRooms ? rooms : undefined,
      activities: includeActivities ? activities : undefined,
    };
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
      .select({
        id: schema.activities.id,
        name: schema.activities.name,
        description: schema.activities.description,
        price: schema.activities.price,
        duration: schema.activities.duration,
        maxGuests: schema.activities.maxGuests,
        categoryId: schema.activities.categoryId,
        category: {
          id: schema.activityCategories.id,
          name: schema.activityCategories.name,
        },
      })
      .from(schema.activities)
      .innerJoin(
        schema.activityCategories,
        eq(schema.activities.categoryId, schema.activityCategories.id),
      )
      .where(inArray(schema.activities.id, activityIds));

    const allImages =
      activityIds.length > 0
        ? await this.imagesService.getImagesByMultipleEntities(
            'activity',
            activityIds,
          )
        : [];

    const imagesByActivityId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByActivityId.get(image.entityId) || [];
      existing.push(image);
      imagesByActivityId.set(image.entityId, existing);
    }

    return activities.map((activity) => ({
      id: activity.id,
      name: activity.name || '',
      description: activity.description || '',
      price: activity.price ? activity.price.toString() : undefined,
      duration: activity.duration || undefined,
      maxGuests: activity.maxGuests || undefined,
      categoryId: activity.categoryId,
      category: activity.category,
      images: imagesByActivityId.get(activity.id) || [],
    }));
  }
  async editProperty(id: string, data: EditPropertyDto) {
    const [existingProperty] = await this.db
      .select()
      .from(schema.properties)
      .where(eq(schema.properties.id, id))
      .limit(1);
    if (!existingProperty) {
      throw new NotFoundException('Property', id);
    }
    const { address, images, ...propertyData } = data;
    const addressId: string = existingProperty.addressId!;
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
    const property = await this.getPropertyById(id);
    
    // CloudBeds sync - fire and forget
    if (this.cloudbedsSyncService) {
      this.cloudbedsSyncService.syncProperty(property.id, 'update').catch(() => {});
    }
    
    return property;
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
    
    // CloudBeds sync - fire and forget
    if (this.cloudbedsSyncService) {
      this.cloudbedsSyncService.syncProperty(id, 'delete').catch(() => {});
    }
  }
}
