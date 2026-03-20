import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { EditPropertyDto } from './dto/edit-property.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { parseAcceptLanguage } from 'src/common/utils/localize';
@ApiTags('Properties')
@ApiBearerAuth('access-token')
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}
  @Public()
  @Get()
  async getProperties(
    @Query() pagination: PaginationDto,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return this.propertiesService.getProperties(pagination, locale);
  }
  @Public()
  @Get('slug/:slug')
  async getPropertyBySlug(
    @Param('slug') slug: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    return await this.propertiesService.getPropertyBySlug(slug, locale);
  }
  @Public()
  @Get(':id')
  async getPropertyById(
    @Param('id') id: string,
    @Query('includeRooms') includeRooms?: string,
    @Query('includeActivities') includeActivities?: string,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = parseAcceptLanguage(acceptLanguage);
    const includeRoomsFlag = includeRooms === 'true';
    const includeActivitiesFlag = includeActivities === 'true';
    if (includeRoomsFlag || includeActivitiesFlag) {
      return await this.propertiesService.getPropertyWithDetails(
        id,
        includeRoomsFlag,
        includeActivitiesFlag,
        locale,
      );
    }
    return await this.propertiesService.getPropertyById(id, locale);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createProperty(@Body() dto: CreatePropertyDto) {
    return await this.propertiesService.createProperty(dto);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editProperty(@Param('id') id: string, @Body() dto: EditPropertyDto) {
    return await this.propertiesService.editProperty(id, dto);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteProperty(@Param('id') id: string) {
    return await this.propertiesService.deleteProperty(id);
  }
}
