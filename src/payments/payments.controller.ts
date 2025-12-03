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
    @Query('invoiceId', new ParseUUIDPipe({ optional: true }))
    invoiceId: string | undefined,
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
  async getPaymentById(@Param('id') id: string) {
    return await this.paymentsService.getPaymentById(id);
  }

  @Post()
  async createPayment(@Body() body: CreatePaymentDto) {
    return await this.paymentsService.createPayment(body);
  }

  @Patch(':id')
  async editPayment(@Param('id') id: string, @Body() body: EditPaymentDto) {
    return await this.paymentsService.editPayment(id, body);
  }

  @Delete(':id')
  async deletePayment(@Param('id') id: string) {
    return await this.paymentsService.deletePayment(id);
  }
}
