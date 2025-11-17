import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
      return await this.reservationRoomsService.getReservationRoomsByReservation(
        reservationId,
      );
    }
    if (roomId) {
      return await this.reservationRoomsService.getReservationRoomsByRoom(
        roomId,
      );
    }
    return await this.reservationRoomsService.getReservationRooms();
  }

  @Get(':id')
  async getReservationRoomById(@Param('id') id: string) {
    return await this.reservationRoomsService.getReservationRoomById(id);
  }

  @Post()
  async createReservationRoom(@Body() body: CreateReservationRoomDto) {
    return await this.reservationRoomsService.createReservationRoom(body);
  }

  @Patch(':id')
  async editReservationRoom(
    @Param('id') id: string,
    @Body() body: EditReservationRoomDto,
  ) {
    return await this.reservationRoomsService.editReservationRoom(id, body);
  }

  @Delete(':id')
  async deleteReservationRoom(@Param('id') id: string) {
    return await this.reservationRoomsService.deleteReservationRoom(id);
  }
}
