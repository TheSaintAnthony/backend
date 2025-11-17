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

@Injectable()
export class LookupsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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

    return (
      this.db
        .update(table)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        .set(value as any)
        .where(eq(table.id, id))
    );
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

  addActivity(data: ActivityData) {
    return this.addValue(schema.activities, {
      name: data.name,
      description: data.description,
    });
  }

  getActivities() {
    return this.getAll(schema.activities);
  }

  getActivityById(id: string) {
    return this.getById(schema.activities, id);
  }

  editActivity(id: string, data: ActivityData) {
    return this.updateValue(schema.activities, id, {
      name: data.name,
      description: data.description,
    });
  }

  deleteActivity(id: string) {
    return this.deleteValue(schema.activities, id);
  }
}
