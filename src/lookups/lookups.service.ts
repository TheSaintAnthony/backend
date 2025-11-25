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

  async addValue(table: LookupTable, value: LookupValue): Promise<unknown> {
    if ('name' in table && value.name) {
      await this.ensureNotExists(table, value.name);
    }

    return this.db.insert(table).values(value as any);
  }

  async getAll(table: LookupTable) {
    return this.db.select().from(table);
  }

  async getById(table: LookupTable, id: string) {
    return this.ensureExistsById(table, id);
  }

  async updateValue(
    table: LookupTable,
    id: string,
    value: UpdateLookupValue,
  ): Promise<unknown> {
    await this.ensureExistsById(table, id);

    return this.db
      .update(table)

      .set(value as any)
      .where(eq(table.id, id));
  }

  async deleteValue(table: LookupTable, id: string) {
    await this.ensureExistsById(table, id);
    return this.db.delete(table).where(eq(table.id, id));
  }

  addAmenity(value: string) {
    return this.addValue(schema.amenities, { name: value });
  }

  getAmenities() {
    return this.getAll(schema.amenities);
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
    return this.getAll(schema.roomTypes);
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
    return this.getAll(schema.highlights);
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

  addPaymentMethod(value: string) {
    return this.addValue(schema.paymentMethods, { name: value });
  }

  getPaymentMethods() {
    return this.getAll(schema.paymentMethods);
  }

  getPaymentMethodById(id: string) {
    return this.getById(schema.paymentMethods, id);
  }

  editPaymentMethod(id: string, value: string) {
    return this.updateValue(schema.paymentMethods, id, { name: value });
  }

  deletePaymentMethod(id: string) {
    return this.deleteValue(schema.paymentMethods, id);
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

    const activitiesWithImages = await Promise.all(
      activities.map(async (activity) => {
        const images = await this.imagesService.getImagesByEntity(
          'activity',
          activity.id,
        );
        return { ...activity, images };
      }),
    );

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
    return this.getAll(schema.activityCategories);
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
}
