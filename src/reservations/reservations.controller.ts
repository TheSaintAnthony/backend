import {
  Body,
  Controller,
  Delete,
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

  @Get('pending')
  async getPendingReservations(@Request() req: AuthenticatedRequest) {
    return this.reservationsService.getPendingReservations(req.user.sub);
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

  @Post('bookings/complete')
  @Idempotent()
  async completeBooking(
    @Body() body: { transactionId: string; paymentMethodId: number },
  ) {
    return this.reservationsService.completeBooking(
      body.transactionId,
      body.paymentMethodId,
    );
  }

  @Delete(':id/cancel')
  async cancelReservation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.cancelReservation(Number(id), req.user.sub);
  }

  @Post(':id/retry-payment')
  @Idempotent()
  async retryPayment(
    @Param('id') id: string,
    @Body() body: { paymentMethodId: number },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.retryPayment(
      Number(id),
      req.user.sub,
      body.paymentMethodId,
    );
  }
}
