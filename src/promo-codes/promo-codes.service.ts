import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_PROVIDER } from 'src/db/drizzle.module';
import * as schema from '../db/schema';
import { eq, and, gte, or, isNull, count } from 'drizzle-orm';
import { StripeService } from 'src/payments/stripe/stripe.service';
import {
  CreatePromoCodeDto,
  ValidatePromoCodeDto,
} from './dto';
import {
  PaginationDto,
  createPaginatedResponse,
} from 'src/common/dto/pagination.dto';
import { NotFoundException } from 'src/filters';

@Injectable()
export class PromoCodesService {
  private readonly logger = new Logger(PromoCodesService.name);

  constructor(
    @Inject(DB_PROVIDER)
    private db: NodePgDatabase<typeof schema>,
    private stripeService: StripeService,
  ) {}

  // Admin: Create a new promo code
  async createPromoCode(data: CreatePromoCodeDto) {
    return this.db.transaction(async (tx) => {
      // 1. Create coupon in Stripe
      const stripeCoupon = await this.stripeService.createCoupon({
        name: data.name,
        discountType: data.discountType,
        discountValue: data.discountValue,
        currency: data.currency,
        maxRedemptions: data.maxRedemptions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });

      // 2. Create coupon in local database
      const [coupon] = await tx
        .insert(schema.coupons)
        .values({
          stripeCouponId: stripeCoupon.id,
          name: data.name,
          discountType: data.discountType,
          discountValue: data.discountValue.toString(),
          currency: data.currency || 'EUR',
          maxRedemptions: data.maxRedemptions,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        })
        .returning();

      // 3. Create promotion code in Stripe
      const stripePromoCode = await this.stripeService.createPromotionCode({
        couponId: stripeCoupon.id,
        code: data.code,
        maxRedemptions: data.maxRedemptions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });

      // 4. Create promo code in local database
      const [promoCode] = await tx
        .insert(schema.promoCodes)
        .values({
          stripePromoCodeId: stripePromoCode.id,
          couponId: coupon.id,
          code: data.code.toUpperCase(),
          maxRedemptions: data.maxRedemptions,
          maxRedemptionsPerUser: data.maxRedemptionsPerUser,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          isVisibleToUsers: data.isVisibleToUsers || false,
          restrictedToProducts: data.restrictedToProducts
            ? JSON.stringify(data.restrictedToProducts)
            : null,
        })
        .returning();

      this.logger.log(`Promo code created: ${promoCode.code}`);
      return { ...promoCode, coupon };
    });
  }

  // Get all promo codes for admin
  async getPromoCodes(pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.promoCodes);

    const data = await this.db
      .select({
        promoCode: schema.promoCodes,
        coupon: schema.coupons,
      })
      .from(schema.promoCodes)
      .leftJoin(
        schema.coupons,
        eq(schema.promoCodes.couponId, schema.coupons.id),
      )
      .limit(limit)
      .offset(offset)
      .orderBy(schema.promoCodes.createdAt);

    const formattedData = data.map((d) => ({
      ...d.promoCode,
      coupon: d.coupon,
    }));

    return createPaginatedResponse(formattedData, totalResult.count, page, limit);
  }

  // Get promo code by ID
  async getPromoCodeById(id: string) {
    const [result] = await this.db
      .select({
        promoCode: schema.promoCodes,
        coupon: schema.coupons,
      })
      .from(schema.promoCodes)
      .leftJoin(
        schema.coupons,
        eq(schema.promoCodes.couponId, schema.coupons.id),
      )
      .where(eq(schema.promoCodes.id, id))
      .limit(1);

    if (!result?.promoCode) {
      throw new NotFoundException('PromoCode', id);
    }

    return { ...result.promoCode, coupon: result.coupon };
  }

  // Get visible promo codes for users
  async getVisiblePromoCodesForUser(userId: string) {
    const now = new Date();

    // Get active, visible promo codes
    const promoCodes = await this.db
      .select({
        promoCode: schema.promoCodes,
        coupon: schema.coupons,
      })
      .from(schema.promoCodes)
      .leftJoin(
        schema.coupons,
        eq(schema.promoCodes.couponId, schema.coupons.id),
      )
      .where(
        and(
          eq(schema.promoCodes.isActive, true),
          eq(schema.promoCodes.isVisibleToUsers, true),
          or(
            isNull(schema.promoCodes.expiresAt),
            gte(schema.promoCodes.expiresAt, now),
          ),
        ),
      );

    // Filter out codes that user has maxed out
    const result = await Promise.all(
      promoCodes.map(async ({ promoCode, coupon }) => {
        if (promoCode.maxRedemptionsPerUser) {
          const [redemptionCount] = await this.db
            .select({ count: count() })
            .from(schema.promoCodeRedemptions)
            .where(
              and(
                eq(schema.promoCodeRedemptions.promoCodeId, promoCode.id),
                eq(schema.promoCodeRedemptions.userId, userId),
              ),
            );

          if (redemptionCount.count >= promoCode.maxRedemptionsPerUser) {
            return null;
          }
        }

        // Check global max redemptions
        if (
          promoCode.maxRedemptions &&
          promoCode.timesRedeemed >= promoCode.maxRedemptions
        ) {
          return null;
        }

        return {
          id: promoCode.id,
          code: promoCode.code,
          discountType: coupon?.discountType,
          discountValue: coupon?.discountValue,
          name: coupon?.name,
          expiresAt: promoCode.expiresAt,
          maxRedemptionsPerUser: promoCode.maxRedemptionsPerUser,
        };
      }),
    );

    return result.filter(Boolean);
  }

  // Validate a promo code
  async validatePromoCode(data: ValidatePromoCodeDto) {
    const { code, userId, amount } = data;

    // 1. Check local database first
    const [localPromoCode] = await this.db
      .select({
        promoCode: schema.promoCodes,
        coupon: schema.coupons,
      })
      .from(schema.promoCodes)
      .leftJoin(
        schema.coupons,
        eq(schema.promoCodes.couponId, schema.coupons.id),
      )
      .where(eq(schema.promoCodes.code, code.toUpperCase()))
      .limit(1);

    if (!localPromoCode?.promoCode) {
      throw new BadRequestException('Código promocional inválido');
    }

    const { promoCode, coupon } = localPromoCode;

    // 2. Check if active
    if (!promoCode.isActive) {
      throw new BadRequestException(
        'Este código promocional não está mais ativo',
      );
    }

    // 3. Check expiration
    if (promoCode.expiresAt && new Date(promoCode.expiresAt) < new Date()) {
      throw new BadRequestException('Este código promocional expirou');
    }

    // 4. Check global redemption limit
    if (
      promoCode.maxRedemptions &&
      promoCode.timesRedeemed >= promoCode.maxRedemptions
    ) {
      throw new BadRequestException(
        'Este código promocional atingiu o limite de utilizações',
      );
    }

    // 5. Check per-user redemption limit
    if (promoCode.maxRedemptionsPerUser && userId) {
      const [userRedemptions] = await this.db
        .select({ count: count() })
        .from(schema.promoCodeRedemptions)
        .where(
          and(
            eq(schema.promoCodeRedemptions.promoCodeId, promoCode.id),
            eq(schema.promoCodeRedemptions.userId, userId),
          ),
        );

      if (userRedemptions.count >= promoCode.maxRedemptionsPerUser) {
        throw new BadRequestException(
          'Já utilizou este código o número máximo de vezes',
        );
      }
    }

    // 6. Validate with Stripe
    const stripeValidation = await this.stripeService.validatePromotionCode(
      code,
    );
    if (!stripeValidation) {
      throw new BadRequestException(
        'Código promocional inválido no sistema de pagamentos',
      );
    }

    // 7. Calculate discount
    let discountAmount = 0;
    if (coupon?.discountType === 'percentage') {
      discountAmount = (amount * parseFloat(coupon.discountValue)) / 100;
    } else if (coupon?.discountType === 'fixed_amount') {
      discountAmount = Math.min(parseFloat(coupon.discountValue), amount);
    }

    return {
      valid: true,
      promoCodeId: promoCode.id,
      stripePromoCodeId: promoCode.stripePromoCodeId,
      discountType: coupon?.discountType,
      discountValue: coupon?.discountValue,
      discountAmount: discountAmount.toFixed(2),
      finalAmount: (amount - discountAmount).toFixed(2),
    };
  }

  // Apply promo code (record redemption)
  async applyPromoCode(
    promoCodeId: string,
    userId: string,
    reservationId: string,
    discountAmount: string,
  ) {
    return this.db.transaction(async (tx) => {
      // Record redemption
      const [redemption] = await tx
        .insert(schema.promoCodeRedemptions)
        .values({
          promoCodeId,
          userId,
          reservationId,
          discountAmount,
        })
        .returning();

      // Update times redeemed
      await tx
        .update(schema.promoCodes)
        .set({
          timesRedeemed: sql`${schema.promoCodes.timesRedeemed} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.promoCodes.id, promoCodeId));

      this.logger.log(
        `Promo code ${promoCodeId} applied for user ${userId}, reservation ${reservationId}`,
      );
      return redemption;
    });
  }

  // Admin: Deactivate promo code
  async deactivatePromoCode(id: string) {
    const [promoCode] = await this.db
      .select()
      .from(schema.promoCodes)
      .where(eq(schema.promoCodes.id, id))
      .limit(1);

    if (!promoCode) {
      throw new NotFoundException('PromoCode', id);
    }

    // Deactivate in Stripe
    await this.stripeService.deactivatePromotionCode(
      promoCode.stripePromoCodeId,
    );

    // Deactivate locally
    const [updated] = await this.db
      .update(schema.promoCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.promoCodes.id, id))
      .returning();

    this.logger.log(`Promo code deactivated: ${promoCode.code}`);
    return updated;
  }

  // Admin: Update visibility
  async updateVisibility(id: string, isVisible: boolean) {
    const [promoCode] = await this.db
      .select()
      .from(schema.promoCodes)
      .where(eq(schema.promoCodes.id, id))
      .limit(1);

    if (!promoCode) {
      throw new NotFoundException('PromoCode', id);
    }

    const [updated] = await this.db
      .update(schema.promoCodes)
      .set({ isVisibleToUsers: isVisible, updatedAt: new Date() })
      .where(eq(schema.promoCodes.id, id))
      .returning();

    this.logger.log(
      `Promo code ${promoCode.code} visibility updated to ${isVisible}`,
    );
    return updated;
  }

  // Get redemption history for a promo code
  async getRedemptionHistory(promoCodeId: string, pagination?: PaginationDto) {
    const page = pagination?.page || 1;
    const limit = Math.min(pagination?.limit || 10, 100);
    const offset = (page - 1) * limit;

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(schema.promoCodeRedemptions)
      .where(eq(schema.promoCodeRedemptions.promoCodeId, promoCodeId));

    const data = await this.db
      .select({
        redemption: schema.promoCodeRedemptions,
        user: {
          id: schema.users.id,
          firstName: schema.users.firstName,
          lastName: schema.users.lastName,
          email: schema.users.email,
        },
      })
      .from(schema.promoCodeRedemptions)
      .leftJoin(
        schema.users,
        eq(schema.promoCodeRedemptions.userId, schema.users.id),
      )
      .where(eq(schema.promoCodeRedemptions.promoCodeId, promoCodeId))
      .limit(limit)
      .offset(offset)
      .orderBy(schema.promoCodeRedemptions.redeemedAt);

    const formattedData = data.map((d) => ({
      ...d.redemption,
      user: d.user,
    }));

    return createPaginatedResponse(formattedData, totalResult.count, page, limit);
  }
}
