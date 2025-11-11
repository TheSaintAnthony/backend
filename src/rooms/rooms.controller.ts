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
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  EditRoomDto,
  CheckAvailabilityDto,
  GetPriceQuoteDto,
} from './dto';
import { Public } from 'src/decorators/public.decorator';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';

@ApiTags('Rooms')
@ApiBearerAuth('access-token')
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

  @Public()
  @Post('availability')
  async checkAvailability(@Body() body: CheckAvailabilityDto) {
    return await this.roomsService.checkAvailability(body);
  }

  @Post('quotes')
  async getPriceQuote(
    @Body() body: GetPriceQuoteDto,
    @Request() req: { user: { sub: number } },
  ) {
    const userId = req.user.sub;
    return await this.roomsService.getPriceQuote(body, userId);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async createRoom(@Body() body: CreateRoomDto) {
    return await this.roomsService.createRoom(body);
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditRoomDto,
  ) {
    return await this.roomsService.editRoom(id, body);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRoom(@Param('id', ParseIntPipe) id: number) {
    return await this.roomsService.deleteRoom(id);
  }
}
