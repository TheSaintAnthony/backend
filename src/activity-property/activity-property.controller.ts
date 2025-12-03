import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
      return this.activityPropertyService.getActivityPropertiesByProperty(
        propertyId,
      );
    }
    if (activityId) {
      return this.activityPropertyService.getActivityPropertiesByActivity(
        activityId,
      );
    }
    return this.activityPropertyService.getActivityProperties();
  }

  @Get(':id')
  async getActivityPropertyById(@Param('id') id: string) {
    return this.activityPropertyService.getActivityPropertyById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createActivityProperty(@Body() body: CreateActivityPropertyDto) {
    return this.activityPropertyService.createActivityProperty(body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteActivityProperty(@Param('id') id: string) {
    return this.activityPropertyService.deleteActivityProperty(id);
  }
}
