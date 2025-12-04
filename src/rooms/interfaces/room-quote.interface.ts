export interface NightlyPrice {
  price: string;
  nights: number;
}
export interface RoomQuote {
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  avgPricePerNight?: string;
  roomTotal?: string;
  nightlyBreakdown?: NightlyPrice[];
  available: boolean;
  error?: string;
}
