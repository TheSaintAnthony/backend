import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Mail from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { EmailConfirmation } from 'src/reservations/interfaces';
import ical from 'ical-generator';
@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPass = this.configService.get<string>('MAIL_PASS');
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth:
        mailUser && mailPass
          ? {
              user: mailUser,
              pass: mailPass,
            }
          : undefined,
    });
  }
  private async sendEmail(options: Mail.Options): Promise<void> {
    await this.transporter.sendMail(options);
  }
  async sendResetPasswordLink(email: string): Promise<void> {
    const payload = { email };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
      expiresIn: this.configService.get('JWT_PASSWORD_RESET_EXPIRATION_TIME'),
    });
    const resetUrl = this.configService.get<string>('EMAIL_RESET_PASSWORD_URL');
    const url = `${resetUrl}?token=${token}`;
    const expirationTime =
      this.configService.get<string>('JWT_PASSWORD_RESET_EXPIRATION_TIME') ||
      '15m';
    const text = `Hi,
You recently requested to reset your password for your St. Anthony account.
Click the link below to reset your password:
${url}
This link will expire in ${expirationTime}.
If you didn't request a password reset, you can safely ignore this email.
Best regards,
St. Anthony Team`;
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);" width="100%" cellspacing="0" cellpadding="0" border="0">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">Hi,</p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                You recently requested to reset your password for your <strong>St. Anthony</strong> account.
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Click the button below to reset your password:
              </p>
              <!-- Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding: 0 0 30px 0;">
                    <a href="${url}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.4);">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                <strong>This link will expire in ${expirationTime}.</strong>
              </p>
              <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 30px 0; padding: 12px; background-color: #f5f5f5; border-radius: 6px; word-break: break-all;">
                <a href="${url}" style="color: #667eea; text-decoration: none; font-size: 13px;">${url}</a>
              </p>
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                Best regards,<br>
                <strong>St. Anthony Team</strong>
              </p>
              <p style="margin: 10px 0 0 0; color: #999999; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: '🔐 Reset Your Password - St. Anthony',
      text,
      html,
    });
  }
  async sendVerifyUserLink(data: { id: string; email: string }) {
    const payload = { subb: data.id, email: data.email };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_USER_VERIFY_SECRET'),
      expiresIn: this.configService.get('JWT_USER_VERIFY_EXPIRATION_TIME'),
    });
    const verifyUrl = this.configService.get<string>('USER_VERIFY_ACCOUNT_URL');
    const url = `${verifyUrl}?token=${token}`;
    const text = `Hi, \nTo verify your account, click here:\n ${url}`;
    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: data.email,
      subject: 'Verify account',
      text,
    });
  }
  async sendReservationConfirmationEmail(emailPayload: EmailConfirmation) {
    const calendarEvents: Array<{
      filename: string;
      content: string;
      contentType: string;
      method: string;
    }> = [];
    const roomDetails = emailPayload.rooms
      .map((room, index) => {
        const icsContent = this.createCalendarEvent(
          room.checkIn,
          room.checkOut,
          emailPayload.userName,
          emailPayload.email,
        );
        calendarEvents.push({
          filename: `booking-room-${index + 1}.ics`,
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8',
          method: 'PUBLISH',
        });
        return `\n\tRoom ${index + 1}:
      \t\tRoom ID: ${room.roomId}
      \t\tCheck-in: ${room.checkIn}
      \t\tCheck-out: ${room.checkOut}
      \t\tGuests: ${room.guestsCount}
      \t\tPrice: $${Number(room.price).toFixed(2)}`;
      })
      .join('\n');
    const specialRequestsText = emailPayload.specialRequests
      ? `\n\tSpecial Requests: ${emailPayload.specialRequests}`
      : '';
    const text = `Hi ${emailPayload.userName},
The St. Anthony hotel can not wait to host you!
Your booking details:
\tName: ${emailPayload.userName}
\tEmail: ${emailPayload.email}
\tTotal Rooms: ${emailPayload.rooms.length}${roomDetails}
${specialRequestsText}
\tTotal Price: $${emailPayload.totalPrice}
\tDeposit Amount: $${emailPayload.depositAmount}
Thank you for choosing St. Anthony hotel. We look forward to your stay!
If you have any questions, please don't hesitate to contact us.
Best regards,
The St. Anthony Hotel Team`;
    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: emailPayload.email,
      subject: 'Booking confirmation',
      text,
      attachments: calendarEvents,
    });
  }
  private createCalendarEvent(
    checkIn: string,
    checkOut: string,
    userName: string,
    userEmail: string,
  ) {
    const calendar = ical({ name: 'St. Anthony Hotel' });
    calendar.createEvent({
      start: checkIn,
      end: checkOut,
      summary: 'Booking',
      location: 'Hotel Address',
      url: 'http://localhost:4200',
      organizer: { name: 'St. Anthony Hotel', email: 'bookings@stanthony.com' },
      attendees: [{ name: userName, email: userEmail }],
    });
    return calendar.toString();
  }
}
