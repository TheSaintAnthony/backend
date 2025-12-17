import { RoomValidation } from './room-validation.interface';
export interface EmailConfirmation {
  userName: string;
  email: string;
  totalPrice: string;
  rooms: RoomValidation[];
  specialRequests?: string;
}
