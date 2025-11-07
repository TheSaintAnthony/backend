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
import { RoomAmenitiesService } from './room-amenities.service';
import { CreateRoomAmenityDto } from './dto';

@ApiTags('Room Amenities')
@ApiBearerAuth('access-token')
@Controller('room-amenities')
export class RoomAmenitiesController {
  constructor(private roomAmenitiesService: RoomAmenitiesService) {}

  @Get()
  async getRoomAmenities(@Query('roomId', ParseIntPipe) roomId?: number) {
    if (roomId) {
      return await this.roomAmenitiesService.getRoomAmenitiesByRoom(roomId);
    }
    return await this.roomAmenitiesService.getRoomAmenities();
  }

  @Get(':id')
  async getRoomAmenityById(@Param('id', ParseIntPipe) id: number) {
    return await this.roomAmenitiesService.getRoomAmenityById(id);
  }

  @Post()
  async createRoomAmenity(@Body() body: CreateRoomAmenityDto) {
    return await this.roomAmenitiesService.createRoomAmenity(body);
  }

  @Delete(':id')
  async deleteRoomAmenity(@Param('id', ParseIntPipe) id: number) {
    return await this.roomAmenitiesService.deleteRoomAmenity(id);
  }
}
