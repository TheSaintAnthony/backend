import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BadRequestException, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from 'src/email/email.service';
import { EmailConfirmation } from 'src/reservations/interfaces';
import {
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PostStayEmail,
} from 'src/notifications/interfaces';
import { EmailJobData } from './interfaces';
@Processor('email')
export class EmailConsumer extends WorkerHost {
  private readonly logger = new Logger(EmailConsumer.name);
  constructor(private readonly emailsService: EmailService) {
    super();
  }
  async process(job: Job<EmailJobData>): Promise<void> {
    const { id, name, attemptsMade } = job;
    const jobData = job.data?.data;
    job.opts.attempts = 3;
    this.logger.log(
      `Starting job [${name}] (ID: ${id}) - Attempt ${attemptsMade + 1}/${3}`,
    );
    try {
      switch (name) {
        case 'sendReservationConfirmationEmail':
          await this.emailsService.sendReservationConfirmationEmail(
            jobData as EmailConfirmation,
          );
          break;
        case 'sendResetPasswordLink':
          await this.emailsService.sendResetPasswordLink(jobData as string);
          break;
        case 'sendVerifyUserLink':
          await this.emailsService.sendVerifyUserLink(
            jobData as { id: string; email: string },
          );
          break;
        case 'sendCheckInReminderEmail':
          await this.emailsService.sendCheckInReminderEmail(
            jobData as CheckInReminderEmail,
          );
          break;
        case 'sendCheckOutReminderEmail':
          await this.emailsService.sendCheckOutReminderEmail(
            jobData as CheckOutReminderEmail,
          );
          break;
        case 'sendPostStayEmail':
          await this.emailsService.sendPostStayEmail(jobData as PostStayEmail);
          break;
        default:
          this.logger.warn(`Unknown job type: ${name}`);
          return;
      }
      this.logger.log(`Completed job [${name}] (ID: ${id})`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed job [${name}] (ID: ${id}) - ${errorMessage}`,
        errorStack,
      );
      throw new BadRequestException('Impossible to send email');
    }
  }
}
