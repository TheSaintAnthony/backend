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
} from '@nestjs/common';
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

@ApiTags('Images')
@ApiBearerAuth('access-token')
@Controller('images')
export class ImagesController {
  constructor(private imagesService: ImagesService) {}

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
