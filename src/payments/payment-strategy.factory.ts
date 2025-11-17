import { Injectable, Inject } from '@nestjs/common';
import { BadRequestException, NotFoundException } from 'src/filters';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { IPaymentStrategy } from './interfaces/payment-strategy.interface';
import { PaypalPaymentStrategy } from './paypal/paypal-payment.strategy';
import { PaymentMethod } from 'src/constants';

@Injectable()
export class PaymentStrategyFactory {
  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private paypalStrategy: PaypalPaymentStrategy,
    // Future strategies will be injected here:
    // private mbWayStrategy: MbWayPaymentStrategy,
    // private mbReferenceStrategy: MbReferencePaymentStrategy,
    // private creditCardStrategy: CreditCardPaymentStrategy,
  ) {}

  async getStrategy(paymentMethodId: string): Promise<IPaymentStrategy> {
    // Fetch payment method from database
    const [method] = await this.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.id, paymentMethodId));

    if (!method) {
      throw new NotFoundException('Payment method', String(paymentMethodId));
    }

    // Return appropriate strategy based on method name
    switch (method.name.toUpperCase()) {
      case PaymentMethod.PAYPAL.toUpperCase():
        return this.paypalStrategy;

      // Future payment methods:
      // case PaymentMethod.MB_WAY.toUpperCase():
      //   return this.mbWayStrategy;
      //
      // case PaymentMethod.MB_REFERENCE.toUpperCase():
      //   return this.mbReferenceStrategy;
      //
      // case PaymentMethod.CREDIT_CARD.toUpperCase():
      //   return this.creditCardStrategy;

      default:
        throw new BadRequestException(
          `Payment method '${method.name}' is not currently supported`,
        );
    }
  }

  async getStrategyByMethodName(methodName: string): Promise<IPaymentStrategy> {
    const [method] = await this.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.name, methodName));

    if (!method) {
      throw new NotFoundException('Payment method', methodName);
    }

    return this.getStrategy(method.id);
  }
}
