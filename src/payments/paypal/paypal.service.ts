import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import {
  ApiError,
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
  OrderApplicationContextLandingPage,
  OrderApplicationContextUserAction,
} from '@paypal/paypal-server-sdk';
import { PaymentsService } from '../payments.service';
import { CreatePaypalOrderDto } from './dto';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';
import { PaymentStatus, PaymentMethod } from 'src/constants';

@Injectable()
export class PaypalService implements OnModuleInit {
  private client: Client;
  private ordersController: OrdersController;
  private paypalMethodId: number;
  private pendingStatusId: number;
  private completedStatusId: number;

  constructor(
    private paymentsService: PaymentsService,
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
  ) {
    this.client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID!,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET!,
      },
      environment:
        process.env.PAYPAL_MODE === 'production'
          ? Environment.Production
          : Environment.Sandbox,
      timeout: 10000,
      logging: {
        logLevel: LogLevel.Info,
        logRequest: {
          logBody: false,
        },
        logResponse: {
          logHeaders: false,
        },
      },
    });

    this.ordersController = new OrdersController(this.client);
  }

  async onModuleInit() {
    const [paypalMethod] = await this.db
      .select()
      .from(schema.paymentMethods)
      .where(eq(schema.paymentMethods.name, PaymentMethod.PAYPAL));

    const [pendingStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.PENDING));

    const [completedStatus] = await this.db
      .select()
      .from(schema.paymentStatus)
      .where(eq(schema.paymentStatus.name, PaymentStatus.COMPLETED));

    if (!paypalMethod) {
      throw new Error(
        `Payment method '${PaymentMethod.PAYPAL}' not found in payment_methods table`,
      );
    }
    if (!pendingStatus) {
      throw new Error(
        `Payment status '${PaymentStatus.PENDING}' not found in payment_status table`,
      );
    }
    if (!completedStatus) {
      throw new Error(
        `Payment status '${PaymentStatus.COMPLETED}' not found in payment_status table`,
      );
    }

    this.paypalMethodId = paypalMethod.id;
    this.pendingStatusId = pendingStatus.id;
    this.completedStatusId = completedStatus.id;
  }

  async createOrder(data: CreatePaypalOrderDto) {
    const returnUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

    const collect = {
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: 'USD',
              value: data.amount,
            },
          },
        ],
        applicationContext: {
          returnUrl: `${returnUrl}/paypal/return`,
          cancelUrl: `${returnUrl}/properties`,
          brandName: 'St. Anthony Reservations',
          landingPage: OrderApplicationContextLandingPage.Billing,
          userAction: OrderApplicationContextUserAction.PayNow,
        },
      },
      prefer: 'return=minimal',
    };

    try {
      const { result } = await this.ordersController.createOrder(collect);

      return {
        orderId: result.id,
        status: result.status,
        links: result.links,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw new BadRequestException('PayPal order creation error');
      }
      throw error;
    }
  }

  async createOrderWithPayment(data: CreatePaypalOrderDto) {
    const paypalOrder = await this.createOrder(data);

    const [payment] = await this.paymentsService.createPayment({
      invoiceId: data.invoiceId,
      amount: data.amount,
      paymentMethodId: this.paypalMethodId,
      paymentStatusId: this.pendingStatusId,
      transactionId: paypalOrder.orderId,
    });

    return {
      ...paypalOrder,
      paymentId: payment.id,
    };
  }

  async captureOrder(orderId: string) {
    try {
      const payment = await this.paymentsService.findByTransactionId(orderId);

      const { result } = await this.ordersController.captureOrder({
        id: orderId,
        prefer: 'return=minimal',
      });

      const captureId =
        result.purchaseUnits?.[0]?.payments?.captures?.[0]?.id || undefined;

      await this.paymentsService.updatePayment(payment.id, {
        paymentStatusId: this.completedStatusId,
        externalReferenceId: captureId,
        paidAt: new Date(),
      });

      return {
        captureId,
        orderId: result.id,
        status: result.status,
        paymentId: payment.id,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException('Payment not found for this order');
      }
      if (error instanceof ApiError) {
        throw new BadRequestException('PayPal order capture error');
      }
      throw error;
    }
  }

  async getOrder(orderId: string) {
    try {
      const { result } = await this.ordersController.getOrder({ id: orderId });
      return result;
    } catch (error) {
      if (error instanceof ApiError) {
        throw new BadRequestException('PayPal order not found');
      }
      throw error;
    }
  }
}
