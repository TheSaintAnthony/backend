type RoomPrice = any;

import { calculateNights } from '../../common/utils/date.utils';

interface NightlyPrice {
  date: Date;
  price: number;
}

interface PriceBreakdown {
  price: string;
  nights: number;
}

function parseDateOnlyUtc(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnlyUtc(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addUtcDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

/**
 * Finds applicable prices for a given date
 */
export function findApplicablePrices(
  date: Date,
  roomPrices: RoomPrice[],
): RoomPrice[] {
  const dateStr = formatDateOnlyUtc(date);
  return roomPrices.filter((price) => {
    const priceStartStr = formatDateOnlyUtc(parseDateOnlyUtc(price.startDate));
    const priceEndStr = formatDateOnlyUtc(parseDateOnlyUtc(price.endDate));
    return dateStr >= priceStartStr && dateStr <= priceEndStr;
  });
}

/**
 * Sorts prices by range length (shortest first), then by creation date (newest first)
 */
export function sortApplicablePrices(prices: RoomPrice[]): RoomPrice[] {
  return prices.sort((a, b) => {
    const aStart = parseDateOnlyUtc(a.startDate);
    const aEnd = parseDateOnlyUtc(a.endDate);
    const bStart = parseDateOnlyUtc(b.startDate);
    const bEnd = parseDateOnlyUtc(b.endDate);
    const aRangeLength = aEnd.getTime() - aStart.getTime();
    const bRangeLength = bEnd.getTime() - bStart.getTime();
    if (aRangeLength !== bRangeLength) {
      return aRangeLength - bRangeLength;
    }
    const aCreated = new Date(a.createdAt);
    const bCreated = new Date(b.createdAt);
    return bCreated.getTime() - aCreated.getTime();
  });
}

/**
 * Calculates nightly prices for a date range
 */
export function calculateNightlyPrices(
  checkIn: Date,
  checkOut: Date,
  roomPrices: RoomPrice[],
): NightlyPrice[] {
  const normalizedCheckIn = parseDateOnlyUtc(checkIn);
  const normalizedCheckOut = parseDateOnlyUtc(checkOut);
  const nights = calculateNights(normalizedCheckIn, normalizedCheckOut);
  const nightlyPrices: NightlyPrice[] = [];
  let currentDate = normalizedCheckIn;

  for (let i = 0; i < nights; i++) {
    const applicablePrices = findApplicablePrices(currentDate, roomPrices);
    if (applicablePrices.length === 0) {
      const dateStr = formatDateOnlyUtc(currentDate);
      throw new Error(`No pricing available for date: ${dateStr}`);
    }

    const sortedPrices = sortApplicablePrices(applicablePrices);
    const applicablePrice = sortedPrices[0];
    const price = Math.round(parseFloat(applicablePrice.price) * 100) / 100;
    nightlyPrices.push({ date: new Date(currentDate), price });
    currentDate = addUtcDays(currentDate, 1);
  }

  return nightlyPrices;
}

/**
 * Groups nightly prices into breakdown format
 */
export function groupPricesIntoBreakdown(
  nightlyPrices: NightlyPrice[],
): PriceBreakdown[] {
  if (nightlyPrices.length === 0) {
    return [];
  }

  const normalizedPrices = nightlyPrices.map(
    (item) => Math.round(item.price * 100) / 100,
  );
  const priceToCents = (price: number) => Math.round(price * 100);
  const priceCountMap = new Map<number, { price: number; count: number }>();

  for (const price of normalizedPrices) {
    const priceCents = priceToCents(price);
    const existing = priceCountMap.get(priceCents);
    if (existing) {
      existing.count++;
    } else {
      priceCountMap.set(priceCents, { price, count: 1 });
    }
  }

  return Array.from(priceCountMap.values())
    .sort((a, b) => a.price - b.price)
    .map((item) => ({
      price: item.price.toFixed(2),
      nights: item.count,
    }));
}

/**
 * Calculates total price from nightly prices
 */
export function calculateTotalFromNightlyPrices(
  nightlyPrices: NightlyPrice[],
): number {
  return nightlyPrices.reduce((total, item) => total + item.price, 0);
}
