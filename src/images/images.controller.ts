import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ImagesService } from './images.service';
import { CreateImageDto, UpdateImageDto, GetImagesQueryDto } from './dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { FileStorageService } from 'src/services/file-storage.service';
import { ConfigService } from '@nestjs/config';
@ApiTags('Images')
@ApiBearerAuth('access-token')
@Controller('images')
export class ImagesController {
  constructor(
    private imagesService: ImagesService,
    private _fileStorageService: FileStorageService,
    private configService: ConfigService,
  ) {}
  @ApiOperation({ summary: 'Upload a single image file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityTypeCode: {
          type: 'string',
          example: 'room',
        },
        entityId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        altText: {
          type: 'string',
          example: 'Beautiful ocean view room',
        },
        caption: {
          type: 'string',
          example: 'Main bedroom',
        },
        displayOrder: {
          type: 'number',
          example: 0,
        },
        isPrimary: {
          type: 'boolean',
          example: true,
        },
      },
      required: ['file', 'entityTypeCode', 'entityId'],
    },
  })
  @Roles(UserRole.ADMIN)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityTypeCode') entityTypeCode: string,
    @Body('entityId') entityId: string,
    @Body('altText') altText?: string,
    @Body('caption') caption?: string,
    @Body('displayOrder') displayOrder?: string,
    @Body('isPrimary') isPrimary?: string,
  ) {
    return await this.imagesService.uploadImage(file, {
      entityTypeCode,
      entityId,
      altText,
      caption,
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : undefined,
      isPrimary: isPrimary === 'true',
    });
  }
  @ApiOperation({ summary: 'Upload multiple image files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        entityTypeCode: {
          type: 'string',
          example: 'room',
        },
        entityId: {
          type: 'string',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
      },
      required: ['files', 'entityTypeCode', 'entityId'],
    },
  })
  @Roles(UserRole.ADMIN)
  @Post('upload/bulk')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('entityTypeCode') entityTypeCode: string,
    @Body('entityId') entityId: string,
  ) {
    return await this.imagesService.uploadMultipleImages(files, {
      entityTypeCode,
      entityId,
    });
  }
  @ApiOperation({ summary: 'Get all images with optional filters' })
  @Public()
  @Get()
  async getImages(@Query() query: GetImagesQueryDto) {
    return await this.imagesService.getImages(query);
  }
  @ApiOperation({ summary: 'Serve image file' })
  @Public()
  @Get('serve/:entityType/:filename')
  serveImage(
    @Param('entityType') entityType: string,
    @Param('filename') filename: string,
    @Res() res: express.Response,
  ) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type');
    const imagePath = `${entityType}/${filename}`;
    const imagesPath = this.configService.get<string>('IMAGES_PATH') || '/Users/luismiranda/Desktop';
    const fullPath = path.join(imagesPath, imagePath);
    const resolvedPath = path.resolve(fullPath);
    const resolvedImagesPath = path.resolve(imagesPath);
    if (!resolvedPath.startsWith(resolvedImagesPath)) {
      return res.status(403).send('Forbidden');
    }
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).send('Image not found');
    }
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
    };
    const contentType = contentTypeMap[ext] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(resolvedPath);
  }
  @ApiOperation({ summary: 'Get image by ID' })
  @Public()
  @Get(':id')
  async getImageById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.imagesService.getImageById(id);
  }
  @ApiOperation({
    summary: 'Get all images for a specific entity',
  })
  @Public()
  @Get('entity/:entityTypeCode/:entityId')
  async getImagesByEntity(
    @Param('entityTypeCode') entityTypeCode: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return await this.imagesService.getImagesByEntity(entityTypeCode, entityId);
  }
  @ApiOperation({
    summary: 'Get primary image for a specific entity',
  })
  @Public()
  @Get('entity/:entityTypeCode/:entityId/primary')
  async getPrimaryImage(
    @Param('entityTypeCode') entityTypeCode: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return await this.imagesService.getPrimaryImage(entityTypeCode, entityId);
  }
  @ApiOperation({ summary: 'Create a new image' })
  @Roles(UserRole.ADMIN)
  @Post()
  async createImage(@Body() body: CreateImageDto) {
    return await this.imagesService.createImage(body);
  }
  @ApiOperation({ summary: 'Create multiple images at once' })
  @Roles(UserRole.ADMIN)
  @Post('bulk')
  async createImages(@Body() body: { images: CreateImageDto[] }) {
    return await this.imagesService.createImages(body.images);
  }
  @ApiOperation({ summary: 'Reorder images for a specific entity' })
  @Roles(UserRole.ADMIN)
  @Post('entity/:entityTypeCode/:entityId/reorder')
  async reorderImages(
    @Param('entityTypeCode') entityTypeCode: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() body: { imageIds: string[] },
  ) {
    return await this.imagesService.reorderImages(
      entityTypeCode,
      entityId,
      body.imageIds,
    );
  }
  @ApiOperation({ summary: 'Update an image' })
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateImageDto,
  ) {
    return await this.imagesService.updateImage(id, body);
  }
  @ApiOperation({ summary: 'Delete an image (soft delete)' })
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteImage(@Param('id', ParseUUIDPipe) id: string) {
    return await this.imagesService.deleteImage(id);
  }
}
