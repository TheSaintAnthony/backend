import { EmailConfirmation } from 'src/reservations/interfaces';
import {
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PostStayEmail,
} from 'src/notifications/interfaces';

export interface EmailJobData {
  data:
    | EmailConfirmation
    | CheckInReminderEmail
    | CheckOutReminderEmail
    | PostStayEmail
    | string
    | { id: string; email: string }
    | undefined;
}
