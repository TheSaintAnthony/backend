export interface CheckInReminderEmail {
  userName: string;
  email: string;
  reservationId: string;
  checkInDate: string;
  checkOutDate: string;
  propertyName: string;
  propertyAddress: string;
  propertyPhone: string;
  propertyEmail: string;
  checkInTime: string;
  arrivalInstructions?: string;
  accessCode: number;
  roomName: string;
  guestsCount: number;
  specialRequests?: string;
}

export interface CheckOutReminderEmail {
  userName: string;
  email: string;
  reservationId: string;
  checkOutDate: string;
  propertyName: string;
  checkOutTime: string;
  roomName: string;
}

export interface PostStayEmail {
  userName: string;
  email: string;
  reservationId: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  feedbackUrl?: string;
}
