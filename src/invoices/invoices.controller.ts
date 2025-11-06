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
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, EditInvoiceDto } from './dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  async getInvoices(
    @Query('reservationId', ParseIntPipe) reservationId?: number,
  ) {
    if (reservationId) {
      return await this.invoicesService.getInvoicesByReservation(reservationId);
    }
    return await this.invoicesService.getInvoices();
  }

  @Get(':id')
  async getInvoiceById(@Param('id', ParseIntPipe) id: number) {
    return await this.invoicesService.getInvoiceById(id);
  }

  @Post()
  async createInvoice(@Body() body: CreateInvoiceDto) {
    return await this.invoicesService.createInvoice(body);
  }

  @Patch(':id')
  async editInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditInvoiceDto,
  ) {
    return await this.invoicesService.editInvoice(id, body);
  }

  @Delete(':id')
  async deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return await this.invoicesService.deleteInvoice(id);
  }
}
