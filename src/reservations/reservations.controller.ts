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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import {
  CreateReservationDto,
  EditReservationDto,
  CreateBookingDto,
} from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { AuthGuard } from 'src/auth/auth.guard';

@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
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

  @Post('bookings')
  async createBooking(
    @Body() body: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return await this.reservationsService.createBooking(userId, body);
  }

  @Post('bookings/paypal')
  async createPaypalBooking(
    @Body() body: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;
    return await this.reservationsService.createPaypalBooking(userId, body);
  }

  @Post('bookings/paypal/:orderId/complete')
  async completePaypalBooking(@Param('orderId') orderId: string) {
    return await this.reservationsService.completePaypalBooking(orderId);
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
