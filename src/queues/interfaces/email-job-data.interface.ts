import { EmailConfirmation } from 'src/reservations/interfaces';
import {
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PostStayEmail,
} from 'src/notifications/interfaces';
import { ReportConfirmationData } from 'src/email/templates';

export interface EmailJobData {
  data:
    | EmailConfirmation
    | CheckInReminderEmail
    | CheckOutReminderEmail
    | PostStayEmail
    | string
    | { id: string; email: string }
    | ReportConfirmationData
    | undefined;
}
