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
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  EditRoomDto,
  CheckAvailabilityDto,
  GetPriceQuoteDto,
  GetRoomsDto,
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
  async getRooms(@Query() query: GetRoomsDto) {
    if (query.propertyId) {
      const { propertyId, ...pagination } = query;
      return await this.roomsService.getRoomsByProperty(propertyId, pagination);
    }
    const { propertyId, ...pagination } = query;
    return await this.roomsService.getRooms(pagination);
  }
  @Public()
  @Get(':id')
  async getRoomById(
    @Param('id') id: string,
    @Query('includeProperty') includeProperty?: string,
  ) {
    if (includeProperty === 'true') {
      return await this.roomsService.getRoomWithProperty(id);
    }
    return await this.roomsService.getRoomById(id);
  }
  @Public()
  @Post('availability')
  async checkAvailability(@Body() body: CheckAvailabilityDto) {
    return await this.roomsService.checkAvailability(body);
  }
  @Public()
  @Post('quotes')
  async getPriceQuote(@Body() body: GetPriceQuoteDto) {
    return await this.roomsService.getPriceQuote(body);
  }
  @Roles(UserRole.ADMIN)
  @Post()
  async createRoom(@Body() body: CreateRoomDto) {
    return await this.roomsService.createRoom(body);
  }
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async editRoom(@Param('id') id: string, @Body() body: EditRoomDto) {
    return await this.roomsService.editRoom(id, body);
  }
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async deleteRoom(@Param('id') id: string) {
    return await this.roomsService.deleteRoom(id);
  }
}
