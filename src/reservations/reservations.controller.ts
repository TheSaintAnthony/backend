import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateBookingDto, UpdateReservationDto } from './dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { UserRole } from 'src/constants';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Idempotent } from 'src/decorators';
@ApiTags('Reservations')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(private reservationsService: ReservationsService) {}
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllReservations(
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    return this.reservationsService.getAllReservations(pagination, status);
  }
  @Patch('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReservationStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.reservationsService.updateReservationStatus(id, body.status);
  }
  @Post('admin/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async cancelReservationAdmin(
    @Param('id') id: string,
    @Body() body?: { issueRefund?: boolean },
  ) {
    return this.reservationsService.cancelReservationAdmin(
      id,
      body?.issueRefund || false,
    );
  }
  @Patch('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateReservation(
    @Param('id') id: string,
    @Body() body: UpdateReservationDto,
  ) {
    return this.reservationsService.updateReservation(id, body);
  }
  @Post('admin/:id/checkin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async checkInReservation(@Param('id') id: string) {
    return this.reservationsService.checkInReservation(id);
  }
  @Get('admin/search')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async searchReservations(
    @Query('customerName') customerName?: string,
    @Query('checkIn') checkIn?: string,
    @Query('checkOut') checkOut?: string,
  ) {
    return this.reservationsService.findReservationByCustomerAndDates(
      customerName,
      checkIn,
      checkOut,
    );
  }
  @Get()
  async getReservations(
    @Request() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
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
    return this.reservationsService.getReservationById(id);
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
  async completeBooking(@Body() body: { transactionId: string }) {
    return this.reservationsService.completeBooking(body.transactionId);
  }
  @Delete(':id/cancel')
  async cancelReservation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.cancelReservation(id, req.user.sub);
  }
  @Post(':id/cancel')
  async cancelReservationCompat(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.cancelReservation(id, req.user.sub);
  }
  @Post(':id/retrypayment')
  @Idempotent()
  async retryPayment(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reservationsService.retryPayment(id, req.user.sub);
  }
  @Post('bookings/clear-holds')
  async clearUserHolds(@Request() req: AuthenticatedRequest) {
    return this.reservationsService.clearUserHolds(req.user.sub);
  }
}
