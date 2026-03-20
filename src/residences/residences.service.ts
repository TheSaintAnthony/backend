import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from 'src/filters';
import {
  localizeResidence,
  parseAcceptLanguage,
  type SupportedLocale,
} from 'src/common/utils/localize';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateResidenceDto } from './dto/create-residence.dto';
import { EditResidenceDto } from './dto/edit-residence.dto';
import { eq, count, isNull } from 'drizzle-orm';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { ImagesService } from 'src/images/images.service';
@Injectable()
export class ResidencesService {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private imagesService: ImagesService,
  ) {}
  async createResidence(data: CreateResidenceDto) {
    const { address, images, ...residenceData } = data;
    let addressId: string | undefined;
    if (address) {
      const [createdAddress] = await this.db
        .insert(schema.addresses)
        .values({ ...address })
        .returning({ id: schema.addresses.id });
      addressId = createdAddress.id;
    }
    const [createdResidence] = await this.db
      .insert(schema.residences)
      .values({
        addressId,
        ...residenceData,
      })
      .returning();
    if (images && images.length > 0) {
      await this.imagesService.createImages(
        images.map((img) => ({
          entityTypeCode: 'residence',
          entityId: createdResidence.id,
          ...img,
        })),
      );
    }
    return this.getResidenceById(createdResidence.id);
  }
  async getResidences(pagination?: PaginationDto, locale?: SupportedLocale) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.residences)
      .where(isNull(schema.residences.deletedAt));
    const total = totalResult.count;
    const data = await this.db.query.residences.findMany({
      limit,
      offset,
      where: isNull(schema.residences.deletedAt),
      with: {
        address: true,
      },
    });
    const residenceIds = data.map((residence) => residence.id);
    const allImages =
      residenceIds.length > 0
        ? await this.imagesService.getImagesByMultipleEntities(
            'residence',
            residenceIds,
          )
        : [];
    const imagesByResidenceId = new Map<string, typeof allImages>();
    for (const image of allImages) {
      const existing = imagesByResidenceId.get(image.entityId) || [];
      existing.push(image);
      imagesByResidenceId.set(image.entityId, existing);
    }
    const residencesWithImages = data.map((residence) => {
      const withImages = {
        ...residence,
        images: imagesByResidenceId.get(residence.id) || [],
      };
      return localizeResidence(withImages as Record<string, unknown>, locale) as typeof withImages;
    });
    return createPaginatedResponse(residencesWithImages, total, page, limit);
  }
  async getResidenceById(id: string, locale?: SupportedLocale) {
    const residence = await this.db.query.residences.findFirst({
      where: eq(schema.residences.id, id),
      with: {
        address: true,
      },
    });
    if (!residence || residence.deletedAt) {
      throw new NotFoundException('Residence', id);
    }
    const images = await this.imagesService.getImagesByEntity('residence', id);
    const withImages = { ...residence, images };
    return localizeResidence(withImages as Record<string, unknown>, locale) as typeof withImages;
  }
  async editResidence(id: string, data: EditResidenceDto) {
    const [residence] = await this.db
      .select()
      .from(schema.residences)
      .where(eq(schema.residences.id, id))
      .limit(1);
    if (!residence || residence.deletedAt) {
      throw new NotFoundException('Residence', id);
    }
    const { address, images, ...residenceData } = data;
    let addressId: string | undefined = residence.addressId || undefined;
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
      addressId = createdAddress.id;
    }
    await this.db
      .update(schema.residences)
      .set({
        ...residenceData,
        ...(addressId && !residence.addressId ? { addressId } : {}),
      })
      .where(eq(schema.residences.id, id));
    if (images !== undefined) {
      const existingImages = await this.imagesService.getImagesByEntity(
        'residence',
        id,
      );
      await Promise.all(
        existingImages.map((img) => this.imagesService.deleteImage(img.id)),
      );
      if (images.length > 0) {
        await this.imagesService.createImages(
          images.map((img) => ({
            entityTypeCode: 'residence',
            entityId: id,
            ...img,
          })),
        );
      }
    }
    return this.getResidenceById(id);
  }
  async deleteResidence(id: string) {
    const [residence] = await this.db
      .select()
      .from(schema.residences)
      .where(eq(schema.residences.id, id))
      .limit(1);
    if (!residence || residence.deletedAt) {
      throw new NotFoundException('Residence', id);
    }
    await this.db
      .update(schema.residences)
      .set({ deletedAt: new Date() })
      .where(eq(schema.residences.id, id));
  }
}
