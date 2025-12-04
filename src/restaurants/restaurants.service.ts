import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { EditRestaurantDto } from './dto/edit-restaurant.dto';
import { eq, count, isNull } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { ImagesService } from 'src/images/images.service';
@Injectable()
export class RestaurantsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
  ) {}
  async createRestaurant(data: CreateRestaurantDto) {
    const { address, images, ...restaurantData } = data;
    let addressId: string | undefined;
    if (address) {
      const [createdAddress] = await this.db
        .insert(schema.addresses)
        .values({ ...address })
        .returning({ id: schema.addresses.id });
      addressId = createdAddress.id;
    }
    const [createdRestaurant] = await this.db
      .insert(schema.restaurants)
      .values({
        addressId,
        ...restaurantData,
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'restaurant',
          entityId: createdRestaurant.id,
          ...img,
        })),
      );
    }
    return this.getRestaurantById(createdRestaurant.id);
  }
  async getRestaurants(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.restaurants)
      .where(isNull(schema.restaurants.deletedAt));
    const total = totalResult.count;
    const data = await this.db.query.restaurants.findMany({
      limit,
      offset,
      where: isNull(schema.restaurants.deletedAt),
      with: {
        address: true,
      },
    });
    const restaurantIds = data.map((restaurant) => restaurant.id);
    const allImages = restaurantIds.length > 0
      ? await this.imagesService.getImagesByMultipleEntities(
          'restaurant',
          restaurantIds,
        )
      : [];
    const imagesByRestaurantId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByRestaurantId.get(image.entityId) || [];
      existing.push(image);
      imagesByRestaurantId.set(image.entityId, existing);
    }
    const restaurantsWithImages = data.map((restaurant) => ({
      ...restaurant,
      images: imagesByRestaurantId.get(restaurant.id) || [],
    }));
    return createPaginatedResponse(restaurantsWithImages, total, page, limit);
  }
  async getRestaurantById(id: string) {
    const restaurant = await this.db.query.restaurants.findFirst({
      where: eq(schema.restaurants.id, id),
      with: {
        address: true,
      },
    });
    if (!restaurant || restaurant.deletedAt) {
      throw new NotFoundException('Restaurant', id);
    }
    const images = await this.imagesService.getImagesByEntity('restaurant', id);
    return { ...restaurant, images };
  }
  async editRestaurant(id: string, data: EditRestaurantDto) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id))
      .limit(1);
    if (!restaurant || restaurant.deletedAt) {
      throw new NotFoundException('Restaurant', id);
    }
    const { address, images, ...restaurantData } = data;
    const addressId: string | undefined = restaurant.addressId || undefined;
    if (address && addressId) {
      await this.db
        .update(schema.addresses)
        .set({ ...address })
        .where(eq(schema.addresses.id, addressId));
    } else if (address && !addressId) {
      const [createdAddress] = await this.db
        .insert(schema.addresses)
        .values({ ...address })
        .returning({ id: schema.addresses.id });
      await this.db
        .update(schema.restaurants)
        .set({
          ...restaurantData,
          addressId: createdAddress.id,
        })
        .where(eq(schema.restaurants.id, id));
    } else {
      await this.db
        .update(schema.restaurants)
        .set({ ...restaurantData })
        .where(eq(schema.restaurants.id, id));
    }
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'restaurant',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'restaurant',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    return this.getRestaurantById(id);
  }
  async deleteRestaurant(id: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id))
      .limit(1);
    if (!restaurant || restaurant.deletedAt) {
      throw new NotFoundException('Restaurant', id);
    }
    await this.db
      .update(schema.restaurants)
      .set({ deletedAt: new Date() })
      .where(eq(schema.restaurants.id, id));
  }
}
