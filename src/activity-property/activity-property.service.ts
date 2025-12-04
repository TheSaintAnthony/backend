import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateActivityPropertyDto } from './dto';
import { eq, and } from 'drizzle-orm';
@Injectable()
export class ActivityPropertyService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {}
  async createActivityProperty(data: CreateActivityPropertyDto) {
    return this.db
      .insert(schema.activityProperty)
      .values({ ...data })
      .returning();
  }
  async getActivityProperties() {
    return this.db.select().from(schema.activityProperty);
  }
  async getActivityPropertyById(id: string) {
    const [activityProperty] = await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id));
    if (!activityProperty) {
      throw new NotFoundException('Activity property', id);
    }
    return activityProperty;
  }
  async getActivityPropertiesByProperty(propertyId: string) {
    return this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.propertyId, propertyId));
  }
  async getActivityPropertiesByActivity(activityId: string) {
    return this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.activityId, activityId));
  }
  async deleteActivityProperty(id: string) {
    const [activityProperty] = await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id));
    if (!activityProperty) {
      throw new NotFoundException('Activity property', id);
    }
    return this.db
      .delete(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id))
      .returning();
  }
  async deleteActivityPropertyByActivityAndProperty(
    activityId: string,
    propertyId: string,
  ) {
    const [activityProperty] = await this.db
      .select()
      .from(schema.activityProperty)
      .where(
        and(
          eq(schema.activityProperty.activityId, activityId),
          eq(schema.activityProperty.propertyId, propertyId),
        ),
      );
    if (!activityProperty) {
      throw new NotFoundException(
        'Activity property',
        `${activityId}-${propertyId}`,
      );
    }
    return this.db
      .delete(schema.activityProperty)
      .where(eq(schema.activityProperty.id, activityProperty.id))
      .returning();
  }
}
