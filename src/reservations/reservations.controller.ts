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
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  EditReservationDto,
  CreateBookingDto,
  GetPriceQuoteDto,
  CheckAvailabilityDto,
} from './dto';

@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get()
  async getReservations(@Query('userId', ParseIntPipe) userId?: number) {
    if (userId) {
      return await this.reservationsService.getReservationsByUser(userId);
    }
    return await this.reservationsService.getReservations();
  }

  @Get(':id')
  async getReservationById(@Param('id', ParseIntPipe) id: number) {
    return await this.reservationsService.getReservationById(id);
  }

  @Post()
  async createReservation(@Body() body: CreateReservationDto) {
    return await this.reservationsService.createReservation(body);
  }

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
  async createBooking(@Body() body: CreateBookingDto) {
    return await this.reservationsService.createBooking(body);
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
