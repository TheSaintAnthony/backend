import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Mail from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

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
}
