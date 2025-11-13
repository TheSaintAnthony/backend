import { EmailConfirmation } from 'src/reservations/interfaces';

export interface EmailJobData {
  data: EmailConfirmation | string | { id: number; email: string } | undefined;
}
