import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto, GetReportsDto } from './dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/user-roles/roles.guard';
import { Roles } from 'src/decorators/role.decorator';
import { Public } from 'src/decorators/public.decorator';
import { UserRole } from 'src/constants';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Public endpoint - no auth required
  @Public()
  @Post()
  async create(@Body() dto: CreateReportDto) {
    return this.reportsService.createReport(dto);
  }

  // Admin endpoints - require authentication
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async getAll(@Query() query: GetReportsDto) {
    return this.reportsService.getReports(query);
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

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.reportsService.deleteReport(id);
  }
}
