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
import { ReservationRoomsService } from './reservation-rooms.service';
import { CreateReservationRoomDto, EditReservationRoomDto } from './dto';

@Controller('reservation-rooms')
export class ReservationRoomsController {
  constructor(private reservationRoomsService: ReservationRoomsService) {}

  @Get()
  async getReservationRooms(
    @Query('reservationId', ParseIntPipe) reservationId?: number,
    @Query('roomId', ParseIntPipe) roomId?: number,
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
  async getReservationRoomById(@Param('id', ParseIntPipe) id: number) {
    return await this.reservationRoomsService.getReservationRoomById(id);
  }

  @Post()
  async createReservationRoom(@Body() body: CreateReservationRoomDto) {
    return await this.reservationRoomsService.createReservationRoom(body);
  }

  @Patch(':id')
  async editReservationRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditReservationRoomDto,
  ) {
    return await this.reservationRoomsService.editReservationRoom(id, body);
  }

  @Delete(':id')
  async deleteReservationRoom(@Param('id', ParseIntPipe) id: number) {
    return await this.reservationRoomsService.deleteReservationRoom(id);
  }
}
