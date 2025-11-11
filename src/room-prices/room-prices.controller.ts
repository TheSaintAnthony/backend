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
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';

@ApiTags('Room Prices')
@ApiBearerAuth('access-token')
@Controller('room/prices')
export class RoomPricesController {
  constructor(private roomPricesService: RoomPricesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  async getRoomPrices(
    @Query('roomId', new ParseIntPipe({ optional: true })) roomId?: number,
  ) {
    if (roomId !== undefined) {
      return await this.roomPricesService.getRoomPricesByRoom(roomId);
    }
    return await this.roomPricesService.getRoomPrices();
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getRoomPriceById(@Param('id', ParseIntPipe) id: number) {
    return await this.roomPricesService.getRoomPriceById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createRoomPrice(@Body() body: CreateRoomPriceDto) {
    return await this.roomPricesService.createRoomPrice(body);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editRoomPrice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditRoomPriceDto,
  ) {
    return await this.roomPricesService.editRoomPrice(id, body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRoomPrice(@Param('id', ParseIntPipe) id: number) {
    return await this.roomPricesService.deleteRoomPrice(id);
  }
}
