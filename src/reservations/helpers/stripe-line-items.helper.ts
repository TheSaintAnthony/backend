import type { RoomValidation } from '../interfaces';
import type { RoomsService } from '../../rooms/rooms.service';
import { calculateNights } from '../../common/utils/date.utils';

interface StoredPricing {
  basePrice: number;
  discountAmount: number;
  discountedBasePrice: number;
  tourismFee: number;
  vatAmount: number;
  totalPrice: number;
  breakdown: {
    rooms: Array<{
      roomId: string;
      basePrice: number;
      tourismFee: number;
      guestsCount: number;
      nights: number;
      quantity: number;
    }>;
  };
}

interface DiscountInfo {
  discountAmount: number;
  promoCode?: string;
  discountType?: 'percentage' | 'fixed_amount';
  discountValue?: string;
  stripePromoCodeId?: string;
  stripeCouponId?: string;
}

interface StripeLineItem {
  priceId?: string | undefined;
  priceData?: {
    currency: string;
    product: string;
    unitAmount: number;
  };
  amount?: number;
  currency?: string;
  quantity: number;
  description: string;
}

/**
 * Prepares Stripe invoice line items for a reservation
 */
export async function prepareStripeInvoiceLineItems(
  validatedRooms: RoomValidation[],
  storedPricing: StoredPricing,
  roomsService: RoomsService,
  discountInfo?: DiscountInfo,
): Promise<StripeLineItem[]> {
  const storedPricingBreakdown = storedPricing.breakdown.rooms;
  const roomBreakdownMap = new Map(
    storedPricingBreakdown.map((room) => [room.roomId, room]),
  );

  const stripeLineItems = await Promise.all(
    validatedRooms.map(async (roomValidation) => {
      const room = await roomsService.getRoomById(roomValidation.roomId);
      const roomBreakdown = roomBreakdownMap.get(roomValidation.roomId);
      const checkIn = new Date(roomValidation.checkIn);
      const checkOut = new Date(roomValidation.checkOut);
      const nights = roomBreakdown
        ? roomBreakdown.nights
        : calculateNights(checkIn, checkOut);
      const roomBasePrice = roomBreakdown
        ? roomBreakdown.basePrice
        : Number(roomValidation.price);
      const basePricePerNight = roomBasePrice / nights;

      if (basePricePerNight <= 0) {
        throw new Error(
          `Invalid price for room ${roomValidation.roomId}: ${roomBasePrice}`,
        );
      }

      if (room.stripeProductId) {
        return {
          priceData: {
            currency: 'eur',
            product: room.stripeProductId,
            unitAmount: Math.round(basePricePerNight * 100),
          },
          quantity: nights,
          description: `${room.name} - ${nights} night(s)`,
        } as StripeLineItem;
      }

      return {
        amount: Math.round(roomBasePrice * 100),
        currency: 'eur',
        quantity: 1,
        description: `${room.name} - ${nights} night(s)`,
      } as StripeLineItem;
    }),
  );

  const firstRoom = await roomsService.getRoomById(validatedRooms[0].roomId);

  const storedDiscountAmount = storedPricing.discountAmount;
  const storedVatAmount = storedPricing.vatAmount;

  if (storedDiscountAmount > 0) {
    const discountDescription = discountInfo?.promoCode
      ? `Desconto - Código ${discountInfo.promoCode}`
      : 'Desconto';

    if (firstRoom.stripeProductId) {
      stripeLineItems.push({
        priceData: {
          currency: 'eur',
          product: firstRoom.stripeProductId,
          unitAmount: -Math.round(storedDiscountAmount * 100),
        },
        quantity: 1,
        description: discountDescription,
      } as StripeLineItem);
    } else {
      stripeLineItems.push({
        amount: -Math.round(storedDiscountAmount * 100),
        currency: 'eur',
        quantity: 1,
        description: discountDescription,
      } as StripeLineItem);
    }
  }

  if (storedVatAmount > 0) {
    if (firstRoom.stripeProductId) {
      stripeLineItems.push({
        priceData: {
          currency: 'eur',
          product: firstRoom.stripeProductId,
          unitAmount: Math.round(storedVatAmount * 100),
        },
        quantity: 1,
        description: 'IVA (23%)',
      } as StripeLineItem);
    } else {
      stripeLineItems.push({
        amount: Math.round(storedVatAmount * 100),
        currency: 'eur',
        quantity: 1,
        description: 'IVA (23%)',
      } as StripeLineItem);
    }
  }

  const tourismFeeStripeItems = await Promise.all(
    validatedRooms.map(async (roomValidation) => {
      const roomBreakdown = roomBreakdownMap.get(roomValidation.roomId);
      if (!roomBreakdown || roomBreakdown.tourismFee <= 0) {
        return null;
      }
      const room = await roomsService.getRoomById(roomValidation.roomId);
      const checkIn = new Date(roomValidation.checkIn);
      const checkOut = new Date(roomValidation.checkOut);
      const nights = roomBreakdown.nights;
      const guestsCount = roomBreakdown.guestsCount;
      const tourismFeeTotal = roomBreakdown.tourismFee;
      const tourismFeePerPersonPerNight =
        nights > 0 && guestsCount > 0
          ? tourismFeeTotal / (guestsCount * nights)
          : 0;
      if (room.stripeProductId) {
        return {
          priceData: {
            currency: 'eur',
            product: room.stripeProductId,
            unitAmount: Math.round(tourismFeePerPersonPerNight * 100),
          },
          quantity: guestsCount * nights,
          description: `Imposto turístico - ${guestsCount} ${guestsCount === 1 ? 'pessoa' : 'pessoas'}, ${nights} ${nights === 1 ? 'noite' : 'noites'}`,
        } as StripeLineItem;
      }

      return {
        amount: Math.round(tourismFeeTotal * 100),
        currency: 'eur',
        quantity: 1,
        description: `Imposto turístico - ${guestsCount} ${guestsCount === 1 ? 'pessoa' : 'pessoas'}, ${nights} ${nights === 1 ? 'noite' : 'noites'}`,
      } as StripeLineItem;
    }),
  );
  const validTourismFeeItems = tourismFeeStripeItems.filter(
    (item): item is StripeLineItem => item !== null,
  );
  stripeLineItems.push(...validTourismFeeItems);

  return stripeLineItems;
}
