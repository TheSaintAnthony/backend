export interface ReservationRoom {
  id: string;
  reservationId: string | null;
  roomId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guestsCount: number | null;
  roomName: string | null;
  roomDescription: string | null;
  propertyId: string | null;
  propertyName: string | null;
  accessCode?: number | null;
}
export interface ReservationWithRooms {
  id: string | null;
  userId: string | null;
  statusId: string | null;
  statusName: string | null;
  totalPrice: string;
  paymentStatusId: string | null;
  paymentStatusName: string | null;
  depositAmount: string;
  specialRequests: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  invoiceUrl?: string | null;
  invoiceTotalAmount?: string | null;
  rooms: ReservationRoom[];
}
