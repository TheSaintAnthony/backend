/**
 * Calculates the number of nights between check-in and check-out dates
 * @param checkIn - Check-in date
 * @param checkOut - Check-out date
 * @returns Number of nights (rounded up)
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = checkOut.getTime() - checkIn.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
