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
import { RoomPricesService } from './room-prices.service';
import { CreateRoomPriceDto, EditRoomPriceDto } from './dto';

@ApiTags('Room Prices')
@ApiBearerAuth('access-token')
@Controller('room/prices')
export class RoomPricesController {
  constructor(private roomPricesService: RoomPricesService) {}

  @Get()
  async getRoomPrices(@Query('roomId', ParseIntPipe) roomId?: number) {
    if (roomId) {
      return await this.roomPricesService.getRoomPricesByRoom(roomId);
    }
    return await this.roomPricesService.getRoomPrices();
  }

  @Get(':id')
  async getRoomPriceById(@Param('id', ParseIntPipe) id: number) {
    return await this.roomPricesService.getRoomPriceById(id);
  }

  @Post()
  async createRoomPrice(@Body() body: CreateRoomPriceDto) {
    return await this.roomPricesService.createRoomPrice(body);
  }

  @Patch(':id')
  async editRoomPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditRoomPriceDto,
  ) {
    return await this.roomPricesService.editRoomPrice(id, body);
  }

  @Delete(':id')
  async deleteRoomPrice(@Param('id', ParseIntPipe) id: number) {
    return await this.roomPricesService.deleteRoomPrice(id);
  }
}
