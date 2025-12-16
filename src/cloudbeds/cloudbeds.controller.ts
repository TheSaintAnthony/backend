import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../user-roles/roles.guard';
import { Roles } from '../decorators/role.decorator';
import { UserRole } from '../constants';
import { CloudBedsApiService } from './cloudbeds-api.service';
import { CloudBedsSyncService } from './cloudbeds-sync.service';
import { PropertiesService } from '../properties/properties.service';
import { RoomsService } from '../rooms/rooms.service';

@ApiTags('CloudBeds')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/cloudbeds')
export class CloudBedsController {
  constructor(
    private cloudbedsApi: CloudBedsApiService,
    private cloudbedsSync: CloudBedsSyncService,
    private propertiesService: PropertiesService,
    private roomsService: RoomsService,
  ) {}

  @Get('hotel-details')
  async getHotelDetails() {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      throw new Error('CloudBeds integration is not enabled');
    }
    return this.cloudbedsApi.getHotelDetails();
  }

  @Get('room-types')
  async getRoomTypes() {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      throw new Error('CloudBeds integration is not enabled');
    }
    return this.cloudbedsApi.getRoomTypes();
  }

  @Post('properties/:id/sync')
  async syncProperty(@Param('id') id: string) {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      return {
        success: false,
        message: 'CloudBeds integration is not enabled',
      };
    }
    await this.cloudbedsSync.syncProperty(id, 'update');
    return { success: true, message: 'Property sync queued' };
  }

  @Post('rooms/:id/sync')
  async syncRoom(@Param('id') id: string) {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      return {
        success: false,
        message: 'CloudBeds integration is not enabled',
      };
    }
    await this.cloudbedsSync.syncRoom(id, 'update');
    return { success: true, message: 'Room sync queued' };
  }

  @Post('test-connection')
  async testConnection() {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      return {
        success: false,
        message: 'CloudBeds integration is not enabled. Please set CLOUDBEDS_ENABLED=true in your environment variables.',
      };
    }
    try {
      await this.cloudbedsApi.getHotelDetails();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      return { success: false, message: `Connection failed: ${error?.message || error}` };
    }
  }

  @Post('sync-all-properties')
  async syncAllProperties() {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      return {
        success: false,
        message: 'CloudBeds integration is not enabled. Please set CLOUDBEDS_ENABLED=true in your environment variables.',
      };
    }
    try {
      // Get all properties (with high limit to get all)
      const response = await this.propertiesService.getProperties({ page: 1, limit: 1000 });
      const properties = response.data;

      let syncedCount = 0;
      for (const property of properties) {
        await this.cloudbedsSync.syncProperty(property.id, 'create');
        syncedCount++;
      }

      return {
        success: true,
        message: `Queued ${syncedCount} properties for CloudBeds sync`,
        count: syncedCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to queue properties: ${error?.message || error}`,
      };
    }
  }

  @Post('sync-all-rooms')
  async syncAllRooms() {
    if (process.env.CLOUDBEDS_ENABLED !== 'true') {
      return {
        success: false,
        message: 'CloudBeds integration is not enabled. Please set CLOUDBEDS_ENABLED=true in your environment variables.',
      };
    }
    try {
      // Get all rooms (with high limit to get all)
      const response = await this.roomsService.getRooms({ page: 1, limit: 1000 });
      const rooms = response.data;

      let syncedCount = 0;
      for (const room of rooms) {
        await this.cloudbedsSync.syncRoom(room.id, 'create');
        syncedCount++;
      }

      return {
        success: true,
        message: `Queued ${syncedCount} rooms for CloudBeds sync`,
        count: syncedCount,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to queue rooms: ${error?.message || error}`,
      };
    }
  }
}

