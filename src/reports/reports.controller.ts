import {
  Controller,
  Get,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  DateRangeDto,
  DailyOperationsDto,
  MonthlyReservationsDto,
  FinancialSummaryDto,
  OccurrencesReportDto,
} from './dto';
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

  @Get('daily-operations')
  @ApiOperation({
    summary: 'Get daily operations report',
    description:
      "Returns today's check-ins, check-outs, in-progress stays, and overdue check-outs. Admin only.",
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Target date (YYYY-MM-DD), defaults to today',
  })
  @ApiQuery({
    name: 'propertyId',
    required: false,
    description: 'Filter by property ID',
  })
  async getDailyOperations(
    @Query(new ValidationPipe({ transform: true })) filters: DailyOperationsDto,
  ) {
    return this.reportsService.getDailyOperations(filters);
  }

  @Get('monthly-reservations')
  @ApiOperation({
    summary: 'Get monthly reservations with pagination',
    description:
      'Returns paginated list of reservations for a month with filtering options. Admin only.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'propertyId',
    required: false,
    description: 'Filter by property ID',
  })
  @ApiQuery({
    name: 'statusId',
    required: false,
    description: 'Filter by status ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  async getMonthlyReservations(
    @Query(new ValidationPipe({ transform: true }))
    filters: MonthlyReservationsDto,
  ) {
    return this.reportsService.getMonthlyReservations(filters);
  }

  @Get('financial-summary')
  @ApiOperation({
    summary: 'Get financial summary report',
    description:
      'Returns pending invoices, overdue payments, and revenue collected. Admin only.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'propertyId',
    required: false,
    description: 'Filter by property ID',
  })
  async getFinancialSummary(
    @Query(new ValidationPipe({ transform: true }))
    filters: FinancialSummaryDto,
  ) {
    return this.reportsService.getFinancialSummary(filters);
  }

  @Get('occurrences')
  @ApiOperation({
    summary: 'Get occurrences report',
    description:
      'Returns paginated list of incidents, maintenance, and notes with status summary. Admin only.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End of date range (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'statusId',
    required: false,
    description: 'Filter by status ID',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  async getOccurrencesReport(
    @Query(new ValidationPipe({ transform: true }))
    filters: OccurrencesReportDto,
  ) {
    return this.reportsService.getOccurrencesReport(filters);
  }
}
