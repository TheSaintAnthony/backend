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
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Rooms')
@ApiBearerAuth('access-token')
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Public()
  @Get()
  async getRooms(
    @Query('propertyId', new ParseIntPipe({ optional: true }))
    propertyId: number | undefined,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination: PaginationDto = {
      page: page || 1,
      limit: limit || 10,
    };

    if (propertyId !== undefined) {
      return await this.roomsService.getRoomsByProperty(propertyId, pagination);
    }
    return await this.roomsService.getRooms(pagination);
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
