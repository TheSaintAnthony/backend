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
    return await this.db
      .insert(schema.activityProperty)
      .values({ ...data })
      .returning();
  }

  async getActivityProperties() {
    return await this.db.select().from(schema.activityProperty);
  }

  async getActivityPropertyById(id: number) {
    const [activityProperty] = await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id));

    if (!activityProperty) {
      throw new NotFoundException('Activity property not found');
    }

    return activityProperty;
  }

  async getActivityPropertiesByProperty(propertyId: number) {
    return await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.propertyId, propertyId));
  }

  async getActivityPropertiesByActivity(activityId: number) {
    return await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.activityId, activityId));
  }

  async deleteActivityProperty(id: number) {
    const [activityProperty] = await this.db
      .select()
      .from(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id));

    if (!activityProperty) {
      throw new NotFoundException('Activity property not found');
    }

    return await this.db
      .delete(schema.activityProperty)
      .where(eq(schema.activityProperty.id, id))
      .returning();
  }

  async deleteActivityPropertyByActivityAndProperty(
    activityId: number,
    propertyId: number,
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
      throw new NotFoundException('Activity property not found');
    }

    return await this.db
      .delete(schema.activityProperty)
      .where(eq(schema.activityProperty.id, activityProperty.id))
      .returning();
  }
}
