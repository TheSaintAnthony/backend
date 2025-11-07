import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityPropertyService } from './activity-property.service';
import { CreateActivityPropertyDto } from './dto';

@ApiTags('Activities')
@ApiBearerAuth('access-token')
@Controller('activity-property')
export class ActivityPropertyController {
  constructor(private activityPropertyService: ActivityPropertyService) {}

  @Get()
  async getActivityProperties(
    @Query('propertyId', ParseIntPipe) propertyId?: number,
    @Query('activityId', ParseIntPipe) activityId?: number,
  ) {
    if (propertyId) {
      return await this.activityPropertyService.getActivityPropertiesByProperty(
        propertyId,
      );
    }
    if (activityId) {
      return await this.activityPropertyService.getActivityPropertiesByActivity(
        activityId,
      );
    }
    return await this.activityPropertyService.getActivityProperties();
  }

  @Get(':id')
  async getActivityPropertyById(@Param('id', ParseIntPipe) id: number) {
    return await this.activityPropertyService.getActivityPropertyById(id);
  }

  @Post()
  async createActivityProperty(@Body() body: CreateActivityPropertyDto) {
    return await this.activityPropertyService.createActivityProperty(body);
  }

  @Delete(':id')
  async deleteActivityProperty(@Param('id', ParseIntPipe) id: number) {
    return await this.activityPropertyService.deleteActivityProperty(id);
  }
}
