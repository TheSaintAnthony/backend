import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationRoomsService } from './reservation-rooms.service';
import { CreateReservationRoomDto, EditReservationRoomDto } from './dto';

@ApiTags('Reservation Rooms')
@ApiBearerAuth('access-token')
@Controller('reservation/rooms')
export class ReservationRoomsController {
  constructor(private reservationRoomsService: ReservationRoomsService) {}

  @Get()
  async getReservationRooms(
    @Query('reservationId') reservationId?: string,
    @Query('roomId') roomId?: string,
  ) {
    if (reservationId) {
      return this.reservationRoomsService.getReservationRoomsByReservation(
        reservationId,
      );
    }
    if (roomId) {
      return this.reservationRoomsService.getReservationRoomsByRoom(roomId);
    }
    return this.reservationRoomsService.getReservationRooms();
  }

  @Get(':id')
  async getReservationRoomById(@Param('id') id: string) {
    return this.reservationRoomsService.getReservationRoomById(id);
  }

  @Post()
  async createReservationRoom(@Body() body: CreateReservationRoomDto) {
    return this.reservationRoomsService.createReservationRoom(body);
  }

  @Patch(':id')
  async editReservationRoom(
    @Param('id') id: string,
    @Body() body: EditReservationRoomDto,
  ) {
    return this.reservationRoomsService.editReservationRoom(id, body);
  }

  @Delete(':id')
  async deleteReservationRoom(@Param('id') id: string) {
    return this.reservationRoomsService.deleteReservationRoom(id);
  }
}
