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
import { RoomAmenitiesService } from './room-amenities.service';
import { CreateRoomAmenityDto } from './dto';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
@ApiTags('Room Amenities')
@ApiBearerAuth('access-token')
@Controller('room/amenities')
export class RoomAmenitiesController {
  constructor(private roomAmenitiesService: RoomAmenitiesService) {}
  @Get()
  async getRoomAmenities(@Query('roomId') roomId?: string) {
    if (roomId) {
      return this.roomAmenitiesService.getRoomAmenitiesByRoom(roomId);
    }
    return this.roomAmenitiesService.getRoomAmenities();
  }
  @Get(':id')
  async getRoomAmenityById(@Param('id') id: string) {
    return this.roomAmenitiesService.getRoomAmenityById(id);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createRoomAmenity(@Body() body: CreateRoomAmenityDto) {
    return this.roomAmenitiesService.createRoomAmenity(body);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRoomAmenity(@Param('id') id: string) {
    return this.roomAmenitiesService.deleteRoomAmenity(id);
  }
}
