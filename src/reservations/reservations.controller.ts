import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateBookingDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { AuthGuard } from 'src/auth/auth.guard';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Idempotent } from 'src/decorators';

@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}

  @Get()
  async getReservations(
    @Request() req: AuthenticatedRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination: PaginationDto = {
      page: page || 1,
      limit: limit || 10,
    };
    return this.reservationsService.getReservationsByUser(
      req.user.sub,
      pagination,
    );
  }

  @Get(':id')
  async getReservationById(@Param('id') id: string) {
    return this.reservationsService.getReservationById(Number(id));
  }

  @Post('bookings')
  @Idempotent()
  async createBooking(
    @Body() body: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.createBooking(req.user.sub, body);
  }

  @Post('bookings/paypal')
  @Idempotent()
  async createPaypalBooking(
    @Body() body: CreateBookingDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.createPaypalBooking(req.user.sub, body);
  }

  @Post('bookings/paypal/:orderId/complete')
  @Idempotent()
  async completePaypalBooking(@Param('orderId') orderId: string) {
    return this.reservationsService.completePaypalBooking(orderId);
  }
}
