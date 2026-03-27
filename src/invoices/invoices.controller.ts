import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, EditInvoiceDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import type { AuthenticatedRequest } from 'src/auth/interfaces';
import { AuthGuard } from 'src/auth/auth.guard';
import { UserRole } from 'src/constants';
@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}
  @Get()
  async getInvoices(
    @Request() req: AuthenticatedRequest,
    @Query('reservationId', new ParseUUIDPipe({ optional: true }))
    reservationId: string | undefined,
    @Query() pagination: PaginationDto,
  ) {
    if (reservationId !== undefined) {
      return await this.invoicesService.getInvoicesByReservationForUser(
        reservationId,
        req.user.sub,
        req.user.roles,
        pagination,
      );
    }
    if (req.user.roles.includes(UserRole.ADMIN)) {
      return await this.invoicesService.getInvoices(pagination);
    }
    return await this.invoicesService.getInvoicesByUser(
      req.user.sub,
      pagination,
    );
  }
  @Get(':id/download')
  async downloadInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.invoicesService.downloadInvoicePdf(
      id,
      req.user.sub,
      req.user.roles,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
  @Get(':id')
  async getInvoiceById(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.invoicesService.getAccessibleInvoiceById(
      id,
      req.user.sub,
      req.user.roles,
    );
  }
  @Post()
  async createInvoice(@Body() body: CreateInvoiceDto) {
    return await this.invoicesService.createInvoice(body);
  }
  @Patch(':id')
  async editInvoice(@Param('id') id: string, @Body() body: EditInvoiceDto) {
    return await this.invoicesService.editInvoice(id, body);
  }
  @Delete(':id')
  async deleteInvoice(@Param('id') id: string) {
    return await this.invoicesService.deleteInvoice(id);
  }
}
