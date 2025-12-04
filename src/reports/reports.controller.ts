import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { DateRangeDto } from './dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
import { Roles } from 'src/decorators';
import { UserRole } from 'src/constants';
@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}
  @Get('revenue')
  @ApiOperation({
    summary: 'Get revenue overview and analytics',
    description:
      'Returns total revenue, breakdown by property/room type/payment method, and outstanding invoices. Admin only.',
  })
  async getRevenueOverview(
    @Query(new ValidationPipe({ transform: true })) filters: DateRangeDto,
  ) {
    return this.reportsService.getRevenueOverview(filters);
  }
  @Get('bookings')
  @ApiOperation({
    summary: 'Get booking trends and statistics',
    description:
      'Returns booking counts by status, trends over time, cancellation rates, and lead time. Admin only.',
  })
  async getBookingTrends(
    @Query(new ValidationPipe({ transform: true })) filters: DateRangeDto,
  ) {
    return this.reportsService.getBookingTrends(filters);
  }
  @Get('occupancy')
  @ApiOperation({
    summary: 'Get occupancy analytics',
    description:
      'Returns occupancy rates by room, property, and room type, plus average length of stay. Admin only.',
  })
  async getOccupancyAnalytics(
    @Query(new ValidationPipe({ transform: true })) filters: DateRangeDto,
  ) {
    return this.reportsService.getOccupancyAnalytics(filters);
  }
  @Get('customers')
  @ApiOperation({
    summary: 'Get customer insights and analytics',
    description:
      'Returns customer acquisition, top customers, segmentation, and demographics. Admin only.',
  })
  async getCustomerInsights(
    @Query(new ValidationPipe({ transform: true })) filters: DateRangeDto,
  ) {
    return this.reportsService.getCustomerInsights(filters);
  }
  @Get('all')
  @ApiOperation({
    summary: 'Get all reports in one call',
    description:
      'Returns revenue, bookings, occupancy, and customer insights in a single response. Admin only.',
  })
  async getAllReports(
    @Query(new ValidationPipe({ transform: true })) filters: DateRangeDto,
  ) {
    return this.reportsService.getAllReports(filters);
  }
}
