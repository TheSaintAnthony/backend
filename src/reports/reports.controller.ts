import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  CreateReportDto,
  UpdateReportDto,
  GetReportsDto,
  DateRangeDto,
  DailyOperationsDto,
  MonthlyReservationsDto,
  FinancialSummaryDto,
  OccurrencesReportDto,
} from './dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { Public } from 'src/decorators/public.decorator';
import { UserRole } from 'src/constants';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Public()
  @Post()
  async create(@Body() dto: CreateReportDto) {
    return this.reportsService.createReport(dto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getAll(@Query() query: GetReportsDto) {
    return this.reportsService.getReports(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('all')
  async getAnalytics(@Query() query: DateRangeDto) {
    return this.reportsService.getAnalytics(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('revenue')
  async getRevenue(@Query() query: DateRangeDto) {
    return this.reportsService.getRevenueReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('bookings')
  async getBookings(@Query() query: DateRangeDto) {
    return this.reportsService.getBookingsReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('occupancy')
  async getOccupancy(@Query() query: DateRangeDto) {
    return this.reportsService.getOccupancyReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('customers')
  async getCustomers(@Query() query: DateRangeDto) {
    return this.reportsService.getCustomersReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('daily-operations')
  async getDailyOperations(@Query() query: DailyOperationsDto) {
    return this.reportsService.getDailyOperationsReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('monthly-reservations')
  async getMonthlyReservations(@Query() query: MonthlyReservationsDto) {
    return this.reportsService.getMonthlyReservationsReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('financial-summary')
  async getFinancialSummary(@Query() query: FinancialSummaryDto) {
    return this.reportsService.getFinancialSummaryReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('occurrences')
  async getOccurrences(@Query() query: OccurrencesReportDto) {
    return this.reportsService.getOccurrencesReport(query);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.reportsService.getReportById(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateReportDto) {
    return this.reportsService.updateReport(id, dto);
  }
}
