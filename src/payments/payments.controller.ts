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
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, EditPaymentDto } from './dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  async getPayments(
    @Query('invoiceId', new ParseIntPipe({ optional: true }))
    invoiceId: number | undefined,
    @Query() pagination: PaginationDto,
  ) {
    if (invoiceId !== undefined) {
      return await this.paymentsService.getPaymentsByInvoice(
        invoiceId,
        pagination,
      );
    }
    return await this.paymentsService.getPayments(pagination);
  }

  @Get(':id')
  async getPaymentById(@Param('id', ParseIntPipe) id: number) {
    return await this.paymentsService.getPaymentById(id);
  }

  @Post()
  async createPayment(@Body() body: CreatePaymentDto) {
    return await this.paymentsService.createPayment(body);
  }

  @Patch(':id')
  async editPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EditPaymentDto,
  ) {
    return await this.paymentsService.editPayment(id, body);
  }

  @Delete(':id')
  async deletePayment(@Param('id', ParseIntPipe) id: number) {
    return await this.paymentsService.deletePayment(id);
  }
}
