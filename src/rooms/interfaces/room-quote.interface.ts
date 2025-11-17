export interface RoomQuote {
  roomId: string;
  checkIn: string;
  checkOut: string;
  nights: string;
  avgPricePerNight?: string;
  roomTotal?: string;
  available: boolean;
  error?: string;
}
