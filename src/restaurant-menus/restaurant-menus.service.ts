import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  CreateRestaurantMenuDto,
  EditRestaurantMenuDto,
  CreateMenuItemDto,
  EditMenuItemDto,
} from './dto';
import { eq, count, isNull, and } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { ImagesService } from 'src/images/images.service';
@Injectable()
export class RestaurantMenusService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
  ) {}
  async createMenu(data: CreateRestaurantMenuDto) {
    const { images, ...menuData } = data;
    const [createdMenu] = await this.db
      .insert(schema.restaurantMenus)
      .values({
        ...menuData,
        isActive: menuData.isActive ?? true,
        displayOrder: menuData.displayOrder ?? 0,
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'restaurant_menu',
          entityId: createdMenu.id,
          ...img,
        })),
      );
    }
    return this.getMenuById(createdMenu.id);
  }
  async getMenus(pagination?: PaginationDto, restaurantId?: string) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const whereConditions = [isNull(schema.restaurantMenus.deletedAt)];
    if (restaurantId) {
      whereConditions.push(
        eq(schema.restaurantMenus.restaurantId, restaurantId),
      );
    }
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.restaurantMenus)
      .where(and(...whereConditions));
    const total = totalResult.count;
    const data = await this.db.query.restaurantMenus.findMany({
      limit,
      offset,
      where: and(...whereConditions),
      with: {
        restaurant: {
          with: {
            address: true,
          },
        },
      },
      orderBy: (menus, { asc }) => [asc(menus.displayOrder)],
    });
    const menuIds = data.map((menu) => menu.id);
    const allImages = menuIds.length > 0
      ? await this.imagesService.getImagesByMultipleEntities(
          'restaurant_menu',
          menuIds,
        )
      : [];
    const imagesByMenuId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByMenuId.get(image.entityId) || [];
      existing.push(image);
      imagesByMenuId.set(image.entityId, existing);
    }
    const menusWithImages = data.map((menu) => ({
      ...menu,
      images: imagesByMenuId.get(menu.id) || [],
    }));
    return createPaginatedResponse(menusWithImages, total, page, limit);
  }
  async getMenuById(id: string) {
    const menu = await this.db.query.restaurantMenus.findFirst({
      where: eq(schema.restaurantMenus.id, id),
      with: {
        restaurant: {
          with: {
            address: true,
          },
        },
        items: {
          where: isNull(schema.restaurantMenuItems.deletedAt),
          with: {
            category: true,
          },
          orderBy: (items, { asc }) => [asc(items.displayOrder)],
        },
      },
    });
    if (!menu || menu.deletedAt) {
      throw new NotFoundException('Restaurant Menu', id);
    }
    const images = await this.imagesService.getImagesByEntity(
      'restaurant_menu',
      id,
    );
    return { ...menu, images };
  }
  async editMenu(id: string, data: EditRestaurantMenuDto) {
    const [menu] = await this.db
      .select()
      .from(schema.restaurantMenus)
      .where(eq(schema.restaurantMenus.id, id))
      .limit(1);
    if (!menu || menu.deletedAt) {
      throw new NotFoundException('Restaurant Menu', id);
    }
    const { images, ...menuData } = data;
    await this.db
      .update(schema.restaurantMenus)
      .set({ ...menuData })
      .where(eq(schema.restaurantMenus.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'restaurant_menu',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'restaurant_menu',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    return this.getMenuById(id);
  }
  async deleteMenu(id: string) {
    const [menu] = await this.db
      .select()
      .from(schema.restaurantMenus)
      .where(eq(schema.restaurantMenus.id, id))
      .limit(1);
    if (!menu || menu.deletedAt) {
      throw new NotFoundException('Restaurant Menu', id);
    }
    await this.db
      .update(schema.restaurantMenus)
      .set({ deletedAt: new Date() })
      .where(eq(schema.restaurantMenus.id, id));
  }
  async createMenuItem(data: CreateMenuItemDto) {
    const [createdItem] = await this.db
      .insert(schema.restaurantMenuItems)
      .values({
        ...data,
        displayOrder: data.displayOrder ?? 0,
      })
      .returning();
    return this.getMenuItemById(createdItem.id);
  }
  async getMenuItems(pagination?: PaginationDto, menuId?: string) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 100, 500);
    const offset = (page - 1) * limit;
    const whereConditions = [isNull(schema.restaurantMenuItems.deletedAt)];
    if (menuId) {
      whereConditions.push(eq(schema.restaurantMenuItems.menuId, menuId));
    }
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.restaurantMenuItems)
      .where(and(...whereConditions));
    const total = totalResult.count;
    const data = await this.db.query.restaurantMenuItems.findMany({
      limit,
      offset,
      where: and(...whereConditions),
      with: {
        menu: {
          with: {
            restaurant: true,
          },
        },
        category: true,
      },
      orderBy: (items, { asc }) => [asc(items.displayOrder)],
    });
    return createPaginatedResponse(data, total, page, limit);
  }
  async getMenuItemById(id: string) {
    const item = await this.db.query.restaurantMenuItems.findFirst({
      where: eq(schema.restaurantMenuItems.id, id),
      with: {
        menu: {
          with: {
            restaurant: true,
          },
        },
      },
    });
    if (!item || item.deletedAt) {
      throw new NotFoundException('Menu Item', id);
    }
    return item;
  }
  async editMenuItem(id: string, data: EditMenuItemDto) {
    const [item] = await this.db
      .select()
      .from(schema.restaurantMenuItems)
      .where(eq(schema.restaurantMenuItems.id, id))
      .limit(1);
    if (!item || item.deletedAt) {
      throw new NotFoundException('Menu Item', id);
    }
    await this.db
      .update(schema.restaurantMenuItems)
      .set({ ...data })
      .where(eq(schema.restaurantMenuItems.id, id));
    return this.getMenuItemById(id);
  }
  async deleteMenuItem(id: string) {
    const [item] = await this.db
      .select()
      .from(schema.restaurantMenuItems)
      .where(eq(schema.restaurantMenuItems.id, id))
      .limit(1);
    if (!item || item.deletedAt) {
      throw new NotFoundException('Menu Item', id);
    }
    await this.db
      .update(schema.restaurantMenuItems)
      .set({ deletedAt: new Date() })
      .where(eq(schema.restaurantMenuItems.id, id));
  }
}
