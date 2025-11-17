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
import { UserRole } from 'src/constants';
import { Roles } from 'src/decorators/role.decorator';

@ApiTags('Activities')
@ApiBearerAuth('access-token')
@Controller('activity/property')
export class ActivityPropertyController {
  constructor(private activityPropertyService: ActivityPropertyService) {}

  @Get()
  async getActivityProperties(
    @Query('propertyId') propertyId?: string,
    @Query('activityId') activityId?: string,
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
  async getActivityPropertyById(@Param('id') id: string) {
    return await this.activityPropertyService.getActivityPropertyById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createActivityProperty(@Body() body: CreateActivityPropertyDto) {
    return await this.activityPropertyService.createActivityProperty(body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteActivityProperty(@Param('id') id: string) {
    return await this.activityPropertyService.deleteActivityProperty(id);
  }
}
