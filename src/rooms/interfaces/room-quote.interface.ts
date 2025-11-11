export interface RoomQuote {
  roomId: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  avgPricePerNight?: string;
  roomTotal?: string;
  available: boolean;
  error?: string;
}
