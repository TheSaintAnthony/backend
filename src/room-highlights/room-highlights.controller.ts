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
import { RoomHighlightsService } from './room-highlights.service';
import { CreateRoomHighlightDto } from './dto';

@Controller('room-highlights')
export class RoomHighlightsController {
  constructor(private roomHighlightsService: RoomHighlightsService) {}

  @Get()
  async getRoomHighlights(@Query('roomId', ParseIntPipe) roomId?: number) {
    if (roomId) {
      return await this.roomHighlightsService.getRoomHighlightsByRoom(roomId);
    }
    return await this.roomHighlightsService.getRoomHighlights();
  }

  @Get(':id')
  async getRoomHighlightById(@Param('id', ParseIntPipe) id: number) {
    return await this.roomHighlightsService.getRoomHighlightById(id);
  }

  @Post()
  async createRoomHighlight(@Body() body: CreateRoomHighlightDto) {
    return await this.roomHighlightsService.createRoomHighlight(body);
  }

  @Delete(':id')
  async deleteRoomHighlight(@Param('id', ParseIntPipe) id: number) {
    return await this.roomHighlightsService.deleteRoomHighlight(id);
  }
}
