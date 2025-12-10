import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateResidenceUnitDto } from './dto/create-residence-unit.dto';
import { EditResidenceUnitDto } from './dto/edit-residence-unit.dto';
import { eq, count, isNull, and } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { ImagesService } from 'src/images/images.service';
@Injectable()
export class ResidenceUnitsService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
  ) {}
  async createResidenceUnit(data: CreateResidenceUnitDto) {
    const { images, ...unitData } = data;
    const [createdUnit] = await this.db
      .insert(schema.residenceUnits)
      .values({
        ...unitData,
        status: unitData.status || 'available',
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'residence_unit',
          entityId: createdUnit.id,
          ...img,
        })),
      );
    }
    return this.getResidenceUnitById(createdUnit.id);
  }
  async getResidenceUnits(pagination?: PaginationDto, residenceId?: string) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const whereConditions = [isNull(schema.residenceUnits.deletedAt)];
    if (residenceId) {
      whereConditions.push(eq(schema.residenceUnits.residenceId, residenceId));
    }
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.residenceUnits)
      .where(and(...whereConditions));
    const total = totalResult.count;
    const data = await this.db.query.residenceUnits.findMany({
      limit,
      offset,
      where: and(...whereConditions),
      with: {
        residence: {
          with: {
            address: true,
          },
        },
      },
    });
    const unitIds = data.map((unit) => unit.id);
    const allImages =
      unitIds.length > 0
        ? await this.imagesService.getImagesByMultipleEntities(
            'residence_unit',
            unitIds,
          )
        : [];
    const imagesByUnitId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByUnitId.get(image.entityId) || [];
      existing.push(image);
      imagesByUnitId.set(image.entityId, existing);
    }
    const unitsWithImages = data.map((unit) => ({
      ...unit,
      images: imagesByUnitId.get(unit.id) || [],
    }));
    return createPaginatedResponse(unitsWithImages, total, page, limit);
  }
  async getResidenceUnitById(id: string) {
    const unit = await this.db.query.residenceUnits.findFirst({
      where: eq(schema.residenceUnits.id, id),
      with: {
        residence: {
          with: {
            address: true,
          },
        },
      },
    });
    if (!unit || unit.deletedAt) {
      throw new NotFoundException('Residence Unit', id);
    }
    const images = await this.imagesService.getImagesByEntity(
      'residence_unit',
      id,
    );
    return { ...unit, images };
  }
  async editResidenceUnit(id: string, data: EditResidenceUnitDto) {
    const [unit] = await this.db
      .select()
      .from(schema.residenceUnits)
      .where(eq(schema.residenceUnits.id, id))
      .limit(1);
    if (!unit || unit.deletedAt) {
      throw new NotFoundException('Residence Unit', id);
    }
    const { images, ...unitData } = data;
    await this.db
      .update(schema.residenceUnits)
      .set({ ...unitData })
      .where(eq(schema.residenceUnits.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'residence_unit',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'residence_unit',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    return this.getResidenceUnitById(id);
  }
  async deleteResidenceUnit(id: string) {
    const [unit] = await this.db
      .select()
      .from(schema.residenceUnits)
      .where(eq(schema.residenceUnits.id, id))
      .limit(1);
    if (!unit || unit.deletedAt) {
      throw new NotFoundException('Residence Unit', id);
    }
    await this.db
      .update(schema.residenceUnits)
      .set({ deletedAt: new Date() })
      .where(eq(schema.residenceUnits.id, id));
  }
}
