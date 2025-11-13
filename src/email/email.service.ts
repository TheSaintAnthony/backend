import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Mail from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { EmailConfirmation } from 'src/reservations/interfaces';

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

    const text = `Hi, \nTo reset your password, click here:\n ${url}`;

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Reset Password',
      text,
    });
  }

  async sendVerifyUserLink(data: { id: number; email: string }) {
    console.log('DATA\n');
    console.log(data);
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
    const roomDetails = emailPayload.rooms
      .map((room, index) => {
        return `\n\tRoom ${index + 1}:
      \t\tRoom ID: ${room.roomId}
      \t\tCheck-in: ${room.checkIn}
      \t\tCheck-out: ${room.checkOut}
      \t\tGuests: ${room.guestsCount}
      \t\tPrice: $${room.price.toFixed(2)}`;
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
    });
  }
}
