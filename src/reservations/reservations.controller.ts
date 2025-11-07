import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  EditReservationDto,
  CreateBookingDto,
  GetPriceQuoteDto,
  CheckAvailabilityDto,
} from './dto';
import { Public } from 'src/decorators/public.decorator';
import type { AuthenticatedRequest } from 'src/auth/interfaces';

@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get()
  async getReservations(@Request() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return await this.reservationsService.getReservationsByUser(userId);
  }

  @Get(':id')
  async getReservationById(@Param('id', ParseIntPipe) id: number) {
    return await this.reservationsService.getReservationById(id);
  }

  @Post()
  async createReservation(
    @Body() body: CreateReservationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return await this.reservationsService.createReservation(userId, body);
  }

  @Public()
  @Post('check-availability')
  async checkAvailability(@Body() body: CheckAvailabilityDto) {
    return await this.reservationsService.checkAvailability(body);
  }

  @Post('quote')
  async getPriceQuote(
    @Body() body: GetPriceQuoteDto,
    @Request() req: { user?: { sub: number } },
  ) {
    const userId = req.user?.sub;
    return await this.reservationsService.getPriceQuote(body, userId);
  }

  @Post('booking')
  async createBooking(
    @Body() body: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return await this.reservationsService.createBooking(userId, body);
  }

  @Patch(':id')
  async editReservation(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditReservationDto,
  ) {
    return await this.reservationsService.editReservation(id, body);
  }

  @Delete(':id')
  async deleteReservation(@Param('id', ParseIntPipe) id: number) {
    return await this.reservationsService.deleteReservation(id);
  }
}
