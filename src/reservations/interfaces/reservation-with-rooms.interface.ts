export interface ReservationRoom {
  id: number;
  reservationId: number | null;
  roomId: number | null;
  checkIn: string | null;
  checkOut: string | null;
  guestsCount: number | null;
  roomName: string | null;
  roomDescription: string | null;
}

export interface ReservationWithRooms {
  id: number | null;
  userId: number | null;
  statusId: number | null;
  statusName: string | null;
  totalPrice: string;
  paymentStatusId: number | null;
  paymentStatusName: string | null;
  depositAmount: string;
  specialRequests: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  rooms: ReservationRoom[];
}
