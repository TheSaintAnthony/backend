export interface CancellationEmail {
  userName: string;
  email: string;
  propertyName?: string;
  checkIn?: string;
  checkOut?: string;
  totalPrice?: string;
  refunded?: boolean;
  rooms?: Array<{
    roomName?: string;
    checkIn?: string;
    checkOut?: string;
    guestsCount?: number;
  }>;
}
