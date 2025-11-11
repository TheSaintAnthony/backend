import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PaypalService } from './paypal.service';
import { CreatePaypalOrderDto } from './dto';

@ApiTags('PayPal')
@ApiBearerAuth('access-token')
@Controller('paypal')
export class PaypalController {
  constructor(private paypalService: PaypalService) {}

  @Post('orders')
  async createOrder(@Body() body: CreatePaypalOrderDto) {
    return await this.paypalService.createOrderWithPayment(body);
  }

  @Post('orders/:orderId/capture')
  async captureOrder(@Param('orderId') orderId: string) {
    return await this.paypalService.captureOrder(orderId);
  }

  @Get('orders/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    return await this.paypalService.getOrder(orderId);
  }
}
