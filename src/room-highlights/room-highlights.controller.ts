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
import { RoomHighlightsService } from './room-highlights.service';
import { CreateRoomHighlightDto } from './dto';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';

@ApiTags('Room Highlights')
@ApiBearerAuth('access-token')
@Controller('room/highlights')
export class RoomHighlightsController {
  constructor(private roomHighlightsService: RoomHighlightsService) {}

  @Get()
  async getRoomHighlights(@Query('roomId') roomId?: string) {
    if (roomId) {
      return await this.roomHighlightsService.getRoomHighlightsByRoom(roomId);
    }
    return await this.roomHighlightsService.getRoomHighlights();
  }

  @Get(':id')
  async getRoomHighlightById(@Param('id') id: string) {
    return await this.roomHighlightsService.getRoomHighlightById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createRoomHighlight(@Body() body: CreateRoomHighlightDto) {
    return await this.roomHighlightsService.createRoomHighlight(body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRoomHighlight(@Param('id') id: string) {
    return await this.roomHighlightsService.deleteRoomHighlight(id);
  }
}
