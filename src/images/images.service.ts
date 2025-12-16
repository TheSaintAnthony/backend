import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException, BadRequestException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { CreateImageDto, UpdateImageDto, GetImagesQueryDto } from './dto';
import { eq, and, isNull, desc, sql, inArray } from 'drizzle-orm';
import { FileStorageService } from 'src/services/file-storage.service';
@Injectable()
export class ImagesService {
  private entityTypeCache = new Map<string, { id: string; code: string }>();
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private fileStorageService: FileStorageService,
  ) {}
  async uploadImage(
    file: Express.Multer.File,
    data: {
      entityTypeCode: string;
      entityId: string;
      altText?: string;
      caption?: string;
      displayOrder?: number;
      isPrimary?: boolean;
    },
  ) {
    const savedFile = await this.fileStorageService.saveFile(
      file,
      data.entityTypeCode,
      data.entityId,
    );
    return await this.createImage({
      entityTypeCode: data.entityTypeCode,
      entityId: data.entityId,
      url: savedFile.url,
      altText: data.altText,
      caption: data.caption,
      displayOrder: data.displayOrder,
      isPrimary: data.isPrimary,
      fileSize: savedFile.size,
      mimeType: savedFile.mimeType,
      originalFilename: file.originalname,
      storageProvider: 'local',
    });
  }
  async uploadMultipleImages(
    files: Express.Multer.File[],
    data: {
      entityTypeCode: string;
      entityId: string;
    },
  ) {
    const uploadedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const image = await this.uploadImage(file, {
        ...data,
        displayOrder: i,
        isPrimary: i === 0,
      });
      uploadedImages.push(image);
    }
    return uploadedImages;
  }
  private async getEntityType(entityTypeCode: string) {
    const cached = this.entityTypeCache.get(entityTypeCode);
    if (cached) {
      return cached;
    }
    const entityType = await this.db.query.entityTypes.findFirst({
      where: eq(schema.entityTypes.code, entityTypeCode),
    });
    if (!entityType) {
      throw new BadRequestException(
        `Entity type '${entityTypeCode}' not found`,
      );
    }
    const entityTypeData = { id: entityType.id, code: entityType.code };
    this.entityTypeCache.set(entityTypeCode, entityTypeData);
    return entityTypeData;
  }
  async createImage(data: CreateImageDto) {
    const entityTypeData = await this.getEntityType(data.entityTypeCode);
    const entityType = await this.db.query.entityTypes.findFirst({
      where: eq(schema.entityTypes.code, data.entityTypeCode),
    });
    if (!entityType) {
      throw new BadRequestException(
        `Entity type '${data.entityTypeCode}' not found`,
      );
    }
    if (!entityType.active) {
      throw new BadRequestException(
        `Entity type '${data.entityTypeCode}' is not active`,
      );
    }
    if (data.isPrimary) {
      await this.db
        .update(schema.images)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.images.entityTypeId, entityType.id),
            eq(schema.images.entityId, data.entityId),
            eq(schema.images.isPrimary, true),
            isNull(schema.images.deletedAt),
          ),
        );
    }
    const insertValues: any = {
      id: sql`gen_random_uuid()`,
      entityTypeId: entityType.id,
      entityId: data.entityId,
      url: data.url,
      altText: data.altText || null,
      caption: data.caption || null,
      displayOrder: data.displayOrder ?? 0,
      isPrimary: data.isPrimary ?? false,
    };

    // Add metadata fields if provided
    if (data.width !== undefined) insertValues.width = data.width;
    if (data.height !== undefined) insertValues.height = data.height;
    if (data.fileSize !== undefined) insertValues.fileSize = data.fileSize;
    if (data.mimeType !== undefined) insertValues.mimeType = data.mimeType;
    if (data.originalFilename !== undefined)
      insertValues.originalFilename = data.originalFilename;
    if (data.storageProvider !== undefined)
      insertValues.storageProvider = data.storageProvider;

    const [image] = await this.db
      .insert(schema.images)
      .values(insertValues)
      .returning();
    return this.getImageById(image.id);
  }
  async getImageById(id: string) {
    const image = await this.db.query.images.findFirst({
      where: and(eq(schema.images.id, id), isNull(schema.images.deletedAt)),
      with: {
        entityType: true,
      },
    });
    if (!image) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }
    return image;
  }
  async getImages(query: GetImagesQueryDto) {
    const whereConditions = [isNull(schema.images.deletedAt)];
    if (query.entityTypeCode) {
      const entityTypeData = await this.getEntityType(query.entityTypeCode);
      whereConditions.push(eq(schema.images.entityTypeId, entityTypeData.id));
    }
    if (query.entityId) {
      whereConditions.push(eq(schema.images.entityId, query.entityId));
    }
    if (query.primaryOnly === true) {
      whereConditions.push(eq(schema.images.isPrimary, true));
    }
    const images = await this.db.query.images.findMany({
      where: and(...whereConditions),
      with: {
        entityType: true,
      },
      orderBy: [schema.images.displayOrder, desc(schema.images.createdAt)],
    });
    return images;
  }
  async getImagesByEntity(entityTypeCode: string, entityId: string) {
    return this.getImages({ entityTypeCode, entityId });
  }
  async getImagesByMultipleEntities(
    entityTypeCode: string,
    entityIds: string[],
  ) {
    if (entityIds.length === 0) {
      return [];
    }
    const entityTypeData = await this.getEntityType(entityTypeCode);
    const images = await this.db.query.images.findMany({
      where: and(
        eq(schema.images.entityTypeId, entityTypeData.id),
        inArray(schema.images.entityId, entityIds),
        isNull(schema.images.deletedAt),
      ),
      with: {
        entityType: true,
      },
      orderBy: [schema.images.displayOrder, desc(schema.images.createdAt)],
    });
    return images;
  }
  async getPrimaryImage(entityTypeCode: string, entityId: string) {
    const images = await this.getImages({
      entityTypeCode,
      entityId,
      primaryOnly: true,
    });
    return images[0] || null;
  }
  async updateImage(id: string, data: UpdateImageDto) {
    const existingImage = await this.getImageById(id);
    if (data.isPrimary === true && !existingImage.isPrimary) {
      await this.db
        .update(schema.images)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(
          and(
            eq(schema.images.entityTypeId, existingImage.entityTypeId),
            eq(schema.images.entityId, existingImage.entityId),
            eq(schema.images.isPrimary, true),
            isNull(schema.images.deletedAt),
          ),
        );
    }
    const updateData: any = {
      url: data.url,
      altText: data.altText,
      caption: data.caption,
      displayOrder: data.displayOrder,
      isPrimary: data.isPrimary,
      updatedAt: new Date(),
    };

    // Add metadata fields if provided
    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
    if (data.mimeType !== undefined) updateData.mimeType = data.mimeType;
    if (data.originalFilename !== undefined)
      updateData.originalFilename = data.originalFilename;
    if (data.storageProvider !== undefined)
      updateData.storageProvider = data.storageProvider;

    const [updatedImage] = await this.db
      .update(schema.images)
      .set(updateData)
      .where(eq(schema.images.id, id))
      .returning();
    return this.getImageById(updatedImage.id);
  }
  async deleteImage(id: string) {
    const image = await this.getImageById(id);
    await this.db
      .update(schema.images)
      .set({ deletedAt: new Date() })
      .where(eq(schema.images.id, id));
    return { message: 'Image deleted successfully', id: image.id };
  }
  async createImages(images: CreateImageDto[]) {
    const createdImages = [];
    for (const imageData of images) {
      const image = await this.createImage(imageData);
      createdImages.push(image);
    }
    return createdImages;
  }
  async reorderImages(
    entityTypeCode: string,
    entityId: string,
    imageIds: string[],
  ) {
    const entityTypeData = await this.getEntityType(entityTypeCode);
    const images = await this.db.query.images.findMany({
      where: and(
        eq(schema.images.entityTypeId, entityTypeData.id),
        eq(schema.images.entityId, entityId),
        isNull(schema.images.deletedAt),
      ),
    });
    const imageMap = new Map(images.map((img) => [img.id, img]));
    for (const imageId of imageIds) {
      if (!imageMap.has(imageId)) {
        throw new BadRequestException(
          `Image ${imageId} does not belong to this entity`,
        );
      }
    }
    for (let i = 0; i < imageIds.length; i++) {
      await this.db
        .update(schema.images)
        .set({ displayOrder: i, updatedAt: new Date() })
        .where(eq(schema.images.id, imageIds[i]));
    }
    return this.getImagesByEntity(entityTypeCode, entityId);
  }
}
