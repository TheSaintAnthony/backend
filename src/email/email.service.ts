import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Mail from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { EmailConfirmation } from 'src/reservations/interfaces';
import ical from 'ical-generator';
import {
  createBaseEmailTemplate,
  createEmailButton,
  createMainTitle,
  createParagraph,
  createDivider,
  createInfoBox,
  createDetailsTable,
  createDetailRow,
  createSectionHeading,
  EMAIL_STYLES,
} from './templates';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter;
  private readonly frontendUrl: string;

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
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'https://stanthony.pt';
  }

  private async sendEmail(options: Mail.Options): Promise<void> {
    await this.transporter.sendMail(options);
  }

  /**
   * Sends a password reset email with styled template
   */
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

    // Plain text version for email clients that don't support HTML
    const text = `The St. Anthony

Recuperação de Password

Recebemos um pedido para redefinir a password da sua conta The St. Anthony.

Clique no link abaixo para redefinir a sua password:
${url}

Este link expira em ${expirationTime}.

Se não solicitou a recuperação de password, pode ignorar este email com segurança.

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    // HTML content
    const content = `
      ${createMainTitle('Recuperação de Password')}
      
      ${createParagraph('Recebemos um pedido para redefinir a password da sua conta <strong>The St. Anthony</strong>.')}
      
      ${createParagraph('Clique no botão abaixo para criar uma nova password:')}
      
      <div style="text-align: center; margin: 35px 0;">
        ${createEmailButton('Redefinir Password', url)}
      </div>
      
      ${createInfoBox(`
        <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>⏱ Este link expira em ${expirationTime}.</strong>
        </p>
      `)}
      
      ${createDivider()}
      
      ${createParagraph('Se o botão não funcionar, copie e cole o seguinte link no seu navegador:', 'muted')}
      
      <p style="margin: 0 0 25px 0; padding: 15px; background-color: ${EMAIL_STYLES.colors.gold}; border-radius: 4px; word-break: break-all;">
        <a href="${url}" style="color: ${EMAIL_STYLES.colors.accent}; text-decoration: none; font-size: 13px;">${url}</a>
      </p>
      
      ${createParagraph('Se não solicitou a recuperação de password, pode ignorar este email com segurança. A sua conta permanece protegida.', 'small')}
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: 'Redefinir a sua password - The St. Anthony',
      showFooterLinks: false,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Recuperação de Password - The St. Anthony',
      text,
      html,
    });
  }

  /**
   * Sends a verification email with styled template
   */
  async sendVerifyUserLink(data: { id: string; email: string }): Promise<void> {
    const payload = { subb: data.id, email: data.email };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_USER_VERIFY_SECRET'),
      expiresIn: this.configService.get('JWT_USER_VERIFY_EXPIRATION_TIME'),
    });

    const verifyUrl = this.configService.get<string>('USER_VERIFY_ACCOUNT_URL');
    const url = `${verifyUrl}?token=${token}`;

    const expirationTime =
      this.configService.get<string>('JWT_USER_VERIFY_EXPIRATION_TIME') ||
      '24h';

    // Plain text version
    const text = `The St. Anthony

Bem-vindo à The St. Anthony Collection

Obrigado por se registar! Estamos entusiasmados por tê-lo connosco.

Para concluir o seu registo e verificar a sua conta, clique no link abaixo:
${url}

Este link expira em ${expirationTime}.

Se não criou uma conta, pode ignorar este email.

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    // HTML content
    const content = `
      ${createMainTitle('Bem-vindo à The St. Anthony Collection')}
      
      ${createParagraph('Obrigado por se registar! Estamos entusiasmados por tê-lo connosco.')}
      
      ${createParagraph('Para concluir o seu registo e começar a descobrir as nossas propriedades exclusivas, por favor verifique o seu email:')}
      
      <div style="text-align: center; margin: 35px 0;">
        ${createEmailButton('Verificar Conta', url)}
      </div>
      
      ${createInfoBox(`
        <p style="margin: 0 0 10px 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>O que pode fazer depois de verificar:</strong>
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: ${EMAIL_STYLES.colors.textMuted}; line-height: 1.8;">
          <li>Reservar estadias nas nossas propriedades</li>
          <li>Aceder a ofertas exclusivas</li>
          <li>Gerir as suas reservas</li>
        </ul>
      `)}
      
      ${createDivider()}
      
      ${createParagraph('Se o botão não funcionar, copie e cole o seguinte link no seu navegador:', 'muted')}
      
      <p style="margin: 0 0 25px 0; padding: 15px; background-color: ${EMAIL_STYLES.colors.gold}; border-radius: 4px; word-break: break-all;">
        <a href="${url}" style="color: ${EMAIL_STYLES.colors.accent}; text-decoration: none; font-size: 13px;">${url}</a>
      </p>
      
      ${createParagraph(`Este link expira em ${expirationTime}. Se não criou uma conta The St. Anthony, pode ignorar este email.`, 'small')}
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: 'Verifique a sua conta - The St. Anthony',
      showFooterLinks: false,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: data.email,
      subject: 'Verifique a sua Conta - The St. Anthony',
      text,
      html,
    });
  }

  /**
   * Sends a reservation confirmation email with styled template
   */
  async sendReservationConfirmationEmail(
    emailPayload: EmailConfirmation,
  ): Promise<void> {
    const calendarEvents: Array<{
      filename: string;
      content: string;
      contentType: string;
      method: string;
    }> = [];

    // Build room details HTML
    const roomDetailsHtml = emailPayload.rooms
      .map((room, index) => {
        const icsContent = this.createCalendarEvent(
          room.checkIn,
          room.checkOut,
          emailPayload.userName,
          emailPayload.email,
        );
        calendarEvents.push({
          filename: `reserva-quarto-${index + 1}.ics`,
          content: icsContent,
          contentType: 'text/calendar; charset=utf-8',
          method: 'PUBLISH',
        });

        const checkInDate = this.formatDate(room.checkIn);
        const checkOutDate = this.formatDate(room.checkOut);

        return `
          <div style="background-color: ${EMAIL_STYLES.colors.gold}; padding: 20px 25px; margin-bottom: 15px; border-left: 4px solid ${EMAIL_STYLES.colors.accent};">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: ${EMAIL_STYLES.colors.accent}; text-transform: uppercase; letter-spacing: 1px;">
              Quarto ${index + 1}
            </h3>
            ${createDetailsTable(`
              ${createDetailRow('Check-in', checkInDate)}
              ${createDetailRow('Check-out', checkOutDate)}
              ${createDetailRow('Hóspedes', `${room.guestsCount} ${Number(room.guestsCount) === 1 ? 'pessoa' : 'pessoas'}`)}
              ${createDetailRow('Preço', `€${Number(room.price).toFixed(2)}`)}
            `)}
          </div>
        `;
      })
      .join('');

    // Plain text version for rooms
    const roomDetailsText = emailPayload.rooms
      .map((room, index) => {
        return `
Quarto ${index + 1}:
  - Check-in: ${this.formatDate(room.checkIn)}
  - Check-out: ${this.formatDate(room.checkOut)}
  - Hóspedes: ${room.guestsCount}
  - Preço: €${Number(room.price).toFixed(2)}`;
      })
      .join('\n');

    const specialRequestsText = emailPayload.specialRequests
      ? `\nPedidos Especiais: ${emailPayload.specialRequests}`
      : '';

    // Plain text version
    const text = `The St. Anthony

Confirmação de Reserva

Olá ${emailPayload.userName},

A sua reserva foi confirmada! Estamos entusiasmados por recebê-lo no The St. Anthony.

Detalhes da Reserva:
${roomDetailsText}
${specialRequestsText}

Resumo do Pagamento:
- Total: €${emailPayload.totalPrice}
- Depósito Pago: €${emailPayload.depositAmount}

Em anexo encontrará os eventos de calendário para adicionar à sua agenda.

Se tiver alguma questão, não hesite em contactar-nos.

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    // HTML content
    const content = `
      ${createMainTitle('Confirmação de Reserva')}
      
      ${createParagraph(`Olá <strong>${emailPayload.userName}</strong>,`)}
      
      ${createParagraph('A sua reserva foi confirmada! Estamos entusiasmados por recebê-lo no <strong>The St. Anthony</strong>.')}
      
      ${createDivider()}
      
      ${createSectionHeading('Detalhes da Reserva')}
      
      ${roomDetailsHtml}
      
      ${
        emailPayload.specialRequests
          ? `
        <div style="margin-top: 25px;">
          ${createSectionHeading('Pedidos Especiais')}
          ${createParagraph(emailPayload.specialRequests, 'muted')}
        </div>
      `
          : ''
      }
      
      ${createDivider()}
      
      ${createSectionHeading('Resumo do Pagamento')}
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid ${EMAIL_STYLES.colors.border};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="font-size: 14px; color: ${EMAIL_STYLES.colors.textMuted};">Total da Reserva</td>
                <td style="text-align: right; font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.colors.textDark};">€${emailPayload.totalPrice}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 15px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="font-size: 14px; color: ${EMAIL_STYLES.colors.textMuted};">Depósito Pago</td>
                <td style="text-align: right; font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.colors.accent};">€${emailPayload.depositAmount}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      ${createInfoBox(`
        <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          📎 <strong>Em anexo encontrará os eventos de calendário</strong> para adicionar à sua agenda.
        </p>
      `)}
      
      ${createDivider()}
      
      <div style="text-align: center; margin: 30px 0;">
        ${createEmailButton('Ver a Minha Conta', `${this.frontendUrl}/account`, 'secondary')}
      </div>
      
      ${createParagraph('Se tiver alguma questão sobre a sua reserva, não hesite em contactar-nos. Teremos todo o gosto em ajudar.', 'muted')}
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: `Reserva confirmada para ${emailPayload.userName} - The St. Anthony`,
      showFooterLinks: true,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: emailPayload.email,
      subject: 'Confirmação de Reserva - The St. Anthony',
      text,
      attachments: calendarEvents,
      html,
    });
  }

  /**
   * Formats a date string to Portuguese locale format
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Creates a calendar event (ICS format) for the booking
   */
  private createCalendarEvent(
    checkIn: string,
    checkOut: string,
    userName: string,
    userEmail: string,
  ): string {
    const calendar = ical({ name: 'The St. Anthony' });
    const hotelEmail =
      this.configService.get<string>('MAIL_FROM') || 'reservas@stanthony.pt';

    calendar.createEvent({
      start: checkIn,
      end: checkOut,
      summary: 'Estadia no The St. Anthony',
      description: `A sua reserva no The St. Anthony está confirmada.\n\nCheck-in: ${this.formatDate(checkIn)}\nCheck-out: ${this.formatDate(checkOut)}\n\nEsperamos por si!`,
      location: 'The St. Anthony, Portugal',
      url: this.frontendUrl,
      organizer: { name: 'The St. Anthony', email: hotelEmail },
      attendees: [{ name: userName, email: userEmail }],
    });

    return calendar.toString();
  }
}
