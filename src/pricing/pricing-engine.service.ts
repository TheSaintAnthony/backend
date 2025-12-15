import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { RoomsService } from 'src/rooms/rooms.service';
import { PropertiesService } from 'src/properties/properties.service';
import { PromoCodesService } from 'src/promo-codes/promo-codes.service';

export interface RoomPricingInput {
  roomId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  quantity?: number;
}

export interface PromoCodeInput {
  promoCodeId: string;
  discountType: 'percentage' | 'fixed_amount';
  discountValue: string;
  stripePromoCodeId?: string;
  stripeCouponId?: string;
  code?: string;
}

export interface RoomPricingBreakdown {
  roomId: string;
  basePrice: number;
  tourismFee: number;
  guestsCount: number;
  nights: number;
  quantity: number;
}

export interface PricingBreakdown {
  basePrice: number;
  discountAmount: number;
  discountedBasePrice: number;
  tourismFee: number;
  vatAmount: number;
  totalPrice: number;
  breakdown: {
    rooms: RoomPricingBreakdown[];
  };
}

@Injectable()
export class PricingEngineService {
  private readonly logger = new Logger(PricingEngineService.name);
  private readonly VAT_PERCENTAGE = 23;

  constructor(
    @Inject(forwardRef(() => RoomsService))
    private roomsService: RoomsService,
    @Inject(forwardRef(() => PropertiesService))
    private propertiesService: PropertiesService,
    private promoCodesService: PromoCodesService,
  ) {}

  async calculatePricing(
    rooms: RoomPricingInput[],
    promoCodeId?: string,
  ): Promise<PricingBreakdown> {
    if (!rooms || rooms.length === 0) {
      throw new Error('At least one room must be specified');
    }

    let totalBasePrice = 0;
    let totalTourismFee = 0;
    const roomBreakdowns: RoomPricingBreakdown[] = [];

    for (const roomInput of rooms) {
      const {
        roomId,
        checkIn,
        checkOut,
        guestsCount,
        quantity = 1,
      } = roomInput;

      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil(
        (checkOutDate.getTime() - checkInDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (nights <= 0) {
        throw new Error(
          `Invalid date range for room ${roomId}: check-out must be after check-in`,
        );
      }

      const { totalPrice: singleRoomBasePrice } =
        await this.roomsService.calculateTotalPriceWithBreakdown(
          roomId,
          checkIn,
          checkOut,
        );

      const roomBasePrice = singleRoomBasePrice * quantity;
      totalBasePrice += roomBasePrice;

      const room = await this.roomsService.getRoomById(roomId);
      let roomTourismFee = 0;

      if (room.propertyId) {
        const property = await this.propertiesService.getPropertyById(
          room.propertyId,
        );
        const propertyWithFee = property as { tourismFee?: string | null };
        const tourismFeePerPersonPerNight = parseFloat(
          (propertyWithFee.tourismFee as string) || '0',
        );

        if (tourismFeePerPersonPerNight > 0) {
          roomTourismFee =
            tourismFeePerPersonPerNight * guestsCount * nights * quantity;
          totalTourismFee += roomTourismFee;
        }
      }

      roomBreakdowns.push({
        roomId,
        basePrice: roomBasePrice,
        tourismFee: roomTourismFee,
        guestsCount,
        nights,
        quantity,
      });
    }

    let discountAmount = 0;
    let promoCodeValidation: PromoCodeInput | null = null;

    if (promoCodeId) {
      try {
        const promoCode =
          await this.promoCodesService.getPromoCodeById(promoCodeId);

        if (promoCode && promoCode.isActive && promoCode.coupon) {
          if (
            promoCode.expiresAt &&
            new Date(promoCode.expiresAt) < new Date()
          ) {
            this.logger.warn(`Promo code ${promoCodeId} has expired`);
          } else if (
            promoCode.maxRedemptions &&
            promoCode.timesRedeemed >= promoCode.maxRedemptions
          ) {
            this.logger.warn(
              `Promo code ${promoCodeId} has reached max redemptions`,
            );
          } else {
            promoCodeValidation = {
              promoCodeId: promoCode.id,
              discountType: promoCode.coupon.discountType as
                | 'percentage'
                | 'fixed_amount',
              discountValue: promoCode.coupon.discountValue || '0',
              stripePromoCodeId: promoCode.stripePromoCodeId,
              stripeCouponId: promoCode.coupon.stripeCouponId,
              code: promoCode.code,
            };

            if (promoCodeValidation.discountType === 'percentage') {
              discountAmount =
                (totalBasePrice *
                  parseFloat(promoCodeValidation.discountValue)) /
                100;
            } else {
              discountAmount = Math.min(
                parseFloat(promoCodeValidation.discountValue),
                totalBasePrice,
              );
            }

            this.logger.log(
              `Promo code ${promoCode.code} applied: ${promoCodeValidation.discountType} ${promoCodeValidation.discountValue}, discount: ${discountAmount.toFixed(2)}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(`Promo code validation failed: ${error}`);
      }
    }

    const discountedBasePrice = Math.max(0, totalBasePrice - discountAmount);
    const vatAmount = discountedBasePrice * (this.VAT_PERCENTAGE / 100);
    const totalPrice = discountedBasePrice + totalTourismFee + vatAmount;

    const breakdown: PricingBreakdown = {
      basePrice: this.roundToTwoDecimals(totalBasePrice),
      discountAmount: this.roundToTwoDecimals(discountAmount),
      discountedBasePrice: this.roundToTwoDecimals(discountedBasePrice),
      tourismFee: this.roundToTwoDecimals(totalTourismFee),
      vatAmount: this.roundToTwoDecimals(vatAmount),
      totalPrice: this.roundToTwoDecimals(totalPrice),
      breakdown: {
        rooms: roomBreakdowns.map((room) => ({
          ...room,
          basePrice: this.roundToTwoDecimals(room.basePrice),
          tourismFee: this.roundToTwoDecimals(room.tourismFee),
        })),
      },
    };

    this.logger.log(
      `[PRICING ENGINE] Pricing calculated for ${rooms.length} room(s): basePrice=${breakdown.basePrice.toFixed(2)}, discount=${breakdown.discountAmount.toFixed(2)}, discountedBase=${breakdown.discountedBasePrice.toFixed(2)}, tourismFee=${breakdown.tourismFee.toFixed(2)}, vat=${breakdown.vatAmount.toFixed(2)}, total=${breakdown.totalPrice.toFixed(2)}`,
    );
    this.logger.log(
      `[PRICING ENGINE] Room breakdown: ${JSON.stringify(breakdown.breakdown.rooms.map((r) => ({ roomId: r.roomId, basePrice: r.basePrice.toFixed(2), tourismFee: r.tourismFee.toFixed(2), guests: r.guestsCount, nights: r.nights })))}`,
    );

    return breakdown;
  }

  calculateTourismFee(
    tourismFeePerPersonPerNight: number,
    guestsCount: number,
    nights: number,
    quantity: number = 1,
  ): number {
    if (tourismFeePerPersonPerNight <= 0) {
      return 0;
    }
    return this.roundToTwoDecimals(
      tourismFeePerPersonPerNight * guestsCount * nights * quantity,
    );
  }

  calculateVAT(basePrice: number, discountAmount: number = 0): number {
    const discountedPrice = Math.max(0, basePrice - discountAmount);
    return this.roundToTwoDecimals(
      discountedPrice * (this.VAT_PERCENTAGE / 100),
    );
  }

  applyPromoCode(
    basePrice: number,
    promoCode: PromoCodeInput,
  ): { discountAmount: number; discountedPrice: number } {
    let discountAmount = 0;

    if (promoCode.discountType === 'percentage') {
      discountAmount = (basePrice * parseFloat(promoCode.discountValue)) / 100;
    } else {
      discountAmount = Math.min(parseFloat(promoCode.discountValue), basePrice);
    }

    const discountedPrice = Math.max(0, basePrice - discountAmount);

    return {
      discountAmount: this.roundToTwoDecimals(discountAmount),
      discountedPrice: this.roundToTwoDecimals(discountedPrice),
    };
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  validatePricingMatch(
    storedTotal: number,
    calculatedTotal: number,
    tolerance: number = 0.01,
  ): boolean {
    const difference = Math.abs(storedTotal - calculatedTotal);
    if (difference > tolerance) {
      this.logger.error(
        `Pricing mismatch detected: stored=${storedTotal}, calculated=${calculatedTotal}, difference=${difference}`,
      );
      return false;
    }
    return true;
  }
}
