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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, EditInvoiceDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Invoices')
@ApiBearerAuth('access-token')
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  async getInvoices(
    @Query('reservationId', new ParseIntPipe({ optional: true }))
    reservationId: number | undefined,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination: PaginationDto = {
      page: page || 1,
      limit: limit || 10,
    };

    if (reservationId !== undefined) {
      return await this.invoicesService.getInvoicesByReservation(
        reservationId,
        pagination,
      );
    }
    return await this.invoicesService.getInvoices(pagination);
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
