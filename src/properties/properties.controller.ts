import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { EditPropertyDto } from './dto/edit-property.dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';

@ApiTags('Properties')
@ApiBearerAuth('access-token')
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Public()
  @Get()
  async getProperties() {
    return this.propertiesService.getProperties();
  }

  @Public()
  @Get(':id')
  async getPropertyById(@Param('id', ParseIntPipe) id: number) {
    return await this.propertiesService.getPropertyById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createProperty(@Body() dto: CreatePropertyDto) {
    return await this.propertiesService.createProperty(dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editProperty(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: EditPropertyDto,
  ) {
    return await this.propertiesService.editProperty(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteProperty(@Param('id', ParseIntPipe) id: number) {
    return await this.propertiesService.deleteProperty(id);
  }
}
