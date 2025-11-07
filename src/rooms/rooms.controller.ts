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
import { RoomsService } from './rooms.service';
import { CreateRoomDto, EditRoomDto } from './dto';
import { Public } from 'src/decorators/public.decorator';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Public()
  @Get()
  async getRooms(@Query('propertyId', ParseIntPipe) propertyId?: number) {
    if (propertyId) {
      return await this.roomsService.getRoomsByProperty(propertyId);
    }
    return await this.roomsService.getRooms();
  }

  @Public()
  @Get(':id')
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return await this.roomsService.getRoomById(id);
  }

  @Post()
  async createRoom(@Body() body: CreateRoomDto) {
    return await this.roomsService.createRoom(body);
  }

  @Patch(':id')
  async editRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditRoomDto,
  ) {
    return await this.roomsService.editRoom(id, body);
  }

  @Delete(':id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    return await this.roomsService.deleteRoom(id);
  }
}
