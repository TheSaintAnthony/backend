import { Inject, Injectable } from '@nestjs/common';
import { ConflictException, NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import {
  LookupTable,
  LookupValue,
  UpdateLookupValue,
  ActivityData,
} from './interfaces';
import { ImagesService } from 'src/images/images.service';
@Injectable()
export class LookupsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
  ) {}
  private getTableName(): string {
    return 'lookup table';
  }
  private async ensureNotExists(table: LookupTable, name: string) {
    const existing = await this.db
      .select()
      .from(table)
      .where(eq(table.name, name))
      .limit(1);
    if (existing.length > 0) {
      throw new ConflictException(
        `Value already exists on ${this.getTableName()}`,
      );
    }
  }
  private async ensureExistsById(table: LookupTable, id: string) {
    const record = await this.db
      .select()
      .from(table)
      .where(eq(table.id, id))
      .limit(1);
    if (record.length === 0) {
      throw new NotFoundException(`Record on ${this.getTableName()} not found`);
    }
    return record[0];
  }

  private async ensureNotSystemManaged(table: LookupTable, id: string) {
    const record = await this.ensureExistsById(table, id);
    if ('isSystemManaged' in record && record.isSystemManaged === true) {
      throw new ConflictException(
        'Cannot modify system-managed lookup values. This value is required for application functionality.',
      );
    }
  }
  async addValue(table: LookupTable, value: LookupValue): Promise<unknown> {
    if ('name' in table && value.name) {
      await this.ensureNotExists(table, value.name);
    }
    return this.db.insert(table).values(value as any);
  }
  async getAll(table: LookupTable, includeSystemManaged = true) {
    const allRecords = await this.db.select().from(table);
    if (!includeSystemManaged) {
      // Filter out system-managed records
      return allRecords.filter((record: any) => !record.isSystemManaged);
    }
    return allRecords;
  }
  async getById(table: LookupTable, id: string) {
    return this.ensureExistsById(table, id);
  }
  async updateValue(
    table: LookupTable,
    id: string,
    value: UpdateLookupValue,
  ): Promise<unknown> {
    await this.ensureNotSystemManaged(table, id);
    await this.ensureExistsById(table, id);
    return (
      this.db
        .update(table)
        .set(value as any)
        .where(eq(table.id, id))
    );
  }
  async deleteValue(table: LookupTable, id: string) {
    await this.ensureNotSystemManaged(table, id);
    await this.ensureExistsById(table, id);
    return this.db.delete(table).where(eq(table.id, id));
  }
  async getAllLookups() {
    const [amenities, roomTypes, highlights, activities, activityCategories, menuCategories, occurrenceStatuses, reservationStatuses, paymentStatuses, invoiceStatuses, roles] = await Promise.all([
      this.getAmenities(),
      this.getRoomTypes(),
      this.getHighlights(),
      this.getActivities(),
      this.getActivityCategories(),
      this.getMenuCategories(),
      this.getOccurrenceStatus(),
      this.getReservationStatus(),
      this.getPaymentStatus(),
      this.getInvoiceStatus(),
      this.getRoles(),
    ]);
    return { amenities, roomTypes, highlights, activities, activityCategories, menuCategories, occurrenceStatuses, reservationStatuses, paymentStatuses, invoiceStatuses, roles };
  }
  addAmenity(value: string) {
    return this.addValue(schema.amenities, { name: value });
  }
  getAmenities() {
    return this.getAll(schema.amenities, false); // Exclude system-managed for admin
  }
  getAmenityById(id: string) {
    return this.getById(schema.amenities, id);
  }
  editAmenity(id: string, value: string) {
    return this.updateValue(schema.amenities, id, { name: value });
  }
  deleteAmenity(id: string) {
    return this.deleteValue(schema.amenities, id);
  }
  addRoomType(name: string, maxCapacity: number) {
    return this.addValue(schema.roomTypes, { name, maxCapacity });
  }
  getRoomTypes() {
    return this.getAll(schema.roomTypes, false); // Exclude system-managed for admin
  }
  getRoomTypeById(id: string) {
    return this.getById(schema.roomTypes, id);
  }
  editRoomType(id: string, name: string, maxCapacity: number) {
    return this.updateValue(schema.roomTypes, id, { name, maxCapacity });
  }
  deleteRoomType(id: string) {
    return this.deleteValue(schema.roomTypes, id);
  }
  addHighlight(value: string) {
    return this.addValue(schema.highlights, { name: value });
  }
  getHighlights() {
    return this.getAll(schema.highlights, false); // Exclude system-managed for admin
  }
  getHighlightById(id: string) {
    return this.getById(schema.highlights, id);
  }
  editHighlight(id: string, value: string) {
    return this.updateValue(schema.highlights, id, { name: value });
  }
  deleteHighlight(id: string) {
    return this.deleteValue(schema.highlights, id);
  }
  addReservationStatus(value: string) {
    return this.addValue(schema.reservationStatus, { name: value });
  }
  getReservationStatus() {
    return this.getAll(schema.reservationStatus);
  }
  getReservationStatusById(id: string) {
    return this.getById(schema.reservationStatus, id);
  }
  editReservationStatus(id: string, value: string) {
    return this.updateValue(schema.reservationStatus, id, { name: value });
  }
  deleteReservationStatus(id: string) {
    return this.deleteValue(schema.reservationStatus, id);
  }
  addInvoiceStatus(value: string) {
    return this.addValue(schema.invoiceStatus, { name: value });
  }
  getInvoiceStatus() {
    return this.getAll(schema.invoiceStatus);
  }
  getInvoiceStatusById(id: string) {
    return this.getById(schema.invoiceStatus, id);
  }
  editInvoiceStatus(id: string, value: string) {
    return this.updateValue(schema.invoiceStatus, id, { name: value });
  }
  deleteInvoiceStatus(id: string) {
    return this.deleteValue(schema.invoiceStatus, id);
  }
  addOccurrenceStatus(value: string) {
    return this.addValue(schema.occurrenceStatus, { name: value });
  }
  getOccurrenceStatus() {
    return this.getAll(schema.occurrenceStatus);
  }
  getOccurrenceStatusById(id: string) {
    return this.getById(schema.occurrenceStatus, id);
  }
  editOccurrenceStatus(id: string, value: string) {
    return this.updateValue(schema.occurrenceStatus, id, { name: value });
  }
  deleteOccurrenceStatus(id: string) {
    return this.deleteValue(schema.occurrenceStatus, id);
  }
  addRole(value: string) {
    return this.addValue(schema.roles, { name: value });
  }
  getRoles() {
    return this.getAll(schema.roles);
  }
  getRoleById(id: string) {
    return this.getById(schema.roles, id);
  }
  editRole(id: string, value: string) {
    return this.updateValue(schema.roles, id, { name: value });
  }
  deleteRole(id: string) {
    return this.deleteValue(schema.roles, id);
  }
  addPaymentStatus(value: string) {
    return this.addValue(schema.paymentStatus, { name: value });
  }
  getPaymentStatus() {
    return this.getAll(schema.paymentStatus);
  }
  getPaymentStatusById(id: string) {
    return this.getById(schema.paymentStatus, id);
  }
  editPaymentStatus(id: string, value: string) {
    return this.updateValue(schema.paymentStatus, id, { name: value });
  }
  deletePaymentStatus(id: string) {
    return this.deleteValue(schema.paymentStatus, id);
  }
  async addActivity(data: ActivityData) {
    const { images, ...activityData } = data;
    const [createdActivity] = await this.db
      .insert(schema.activities)
      .values({
        ...activityData,
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'activity',
          entityId: createdActivity.id,
          ...img,
        })),
      );
    }
    return this.getActivityById(createdActivity.id);
  }
  async getActivities() {
    const activities = await this.db.query.activities.findMany();
    const activityIds = activities.map((activity) => activity.id);
    const allImages = activityIds.length > 0
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
    const activitiesWithImages = activities.map((activity) => ({
      ...activity,
      images: imagesByActivityId.get(activity.id) || [],
    }));
    return activitiesWithImages;
  }
  async getActivityById(id: string) {
    const activity = await this.db.query.activities.findFirst({
      where: eq(schema.activities.id, id),
    });
    if (!activity) {
      throw new NotFoundException('Activity', id);
    }
    const images = await this.imagesService.getImagesByEntity('activity', id);
    return { ...activity, images };
  }
  async editActivity(id: string, data: ActivityData) {
    const activity = await this.db.query.activities.findFirst({
      where: eq(schema.activities.id, id),
    });
    if (!activity) {
      throw new NotFoundException('Activity', id);
    }
    const { images, ...activityData } = data;
    await this.db
      .update(schema.activities)
      .set({ ...activityData })
      .where(eq(schema.activities.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'activity',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'activity',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    return this.getActivityById(id);
  }
  deleteActivity(id: string) {
    return this.deleteValue(schema.activities, id);
  }
  addActivityCategory(value: string) {
    return this.addValue(schema.activityCategories, { name: value });
  }
  getActivityCategories() {
    return this.getAll(schema.activityCategories, false); // Exclude system-managed for admin
  }
  getActivityCategoryById(id: string) {
    return this.getById(schema.activityCategories, id);
  }
  editActivityCategory(id: string, value: string) {
    return this.updateValue(schema.activityCategories, id, { name: value });
  }
  deleteActivityCategory(id: string) {
    return this.deleteValue(schema.activityCategories, id);
  }
  async addMenuCategory(value: string, displayOrder = 0) {
    const [existing] = await this.db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.name, value))
      .limit(1);
    if (existing) {
      throw new ConflictException('Menu Category', { name: value });
    }
    const [created] = await this.db
      .insert(schema.menuCategories)
      .values({ name: value, displayOrder })
      .returning();
    return created;
  }
  async getMenuCategories() {
    const allCategories = await this.db
      .select()
      .from(schema.menuCategories)
      .orderBy(schema.menuCategories.displayOrder);
    // Filter out system-managed categories for admin
    return allCategories.filter((cat: any) => !cat.isSystemManaged);
  }
  async getMenuCategoryById(id: string) {
    const [category] = await this.db
      .select()
      .from(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id))
      .limit(1);
    if (!category) {
      throw new NotFoundException('Menu Category', id);
    }
    return category;
  }
  async editMenuCategory(id: string, value: string, displayOrder?: number) {
    await this.getMenuCategoryById(id); // Ensure it exists
    const updateData: { name: string; displayOrder?: number } = { name: value };
    if (displayOrder !== undefined) {
      updateData.displayOrder = displayOrder;
    }
    const [updated] = await this.db
      .update(schema.menuCategories)
      .set(updateData)
      .where(eq(schema.menuCategories.id, id))
      .returning();
    return updated;
  }
  async deleteMenuCategory(id: string) {
    await this.getMenuCategoryById(id); // Ensure it exists
    await this.db
      .delete(schema.menuCategories)
      .where(eq(schema.menuCategories.id, id));
  }
}
