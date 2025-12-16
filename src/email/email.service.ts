import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as Mail from 'nodemailer/lib/mailer';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';
import { EmailConfirmation } from 'src/reservations/interfaces';
import {
  CheckInReminderEmail,
  CheckOutReminderEmail,
  PostStayEmail,
} from 'src/notifications/interfaces';
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

  async sendReservationConfirmationEmail(
    emailPayload: EmailConfirmation,
  ): Promise<void> {
    const calendarEvents: Array<{
      filename: string;
      content: string;
      contentType: string;
      method: string;
    }> = [];

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

    const text = `The St. Anthony

Confirmação de Reserva

Olá ${emailPayload.userName},

A sua reserva foi confirmada! Estamos entusiasmados por recebê-lo no The St. Anthony.

Detalhes da Reserva:
${roomDetailsText}
${specialRequestsText}

Resumo do Pagamento:
- Total: €${Number(emailPayload.totalPrice).toFixed(2)}

Em anexo encontrará os eventos de calendário para adicionar à sua agenda.

Se tiver alguma questão, não hesite em contactar-nos.

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

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
          <td style="padding: 15px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="font-size: 14px; color: ${EMAIL_STYLES.colors.textMuted};">Total da Reserva</td>
                <td style="text-align: right; font-size: 16px; font-weight: 600; color: ${EMAIL_STYLES.colors.textDark};">€${Number(emailPayload.totalPrice).toFixed(2)}</td>
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

  async sendCheckInReminderEmail(
    emailPayload: CheckInReminderEmail,
  ): Promise<void> {
    const checkInDate = this.formatDate(emailPayload.checkInDate);
    const checkOutDate = this.formatDate(emailPayload.checkOutDate);

    const text = `The St. Anthony

Lembrete de Check-in

Olá ${emailPayload.userName},

A sua estadia no ${emailPayload.propertyName} aproxima-se! Estamos ansiosos por recebê-lo.

Detalhes da Reserva:
- Check-in: ${checkInDate}
- Check-out: ${checkOutDate}
- Quarto: ${emailPayload.roomName}
- Hóspedes: ${emailPayload.guestsCount}

Informações de Check-in:
- Horário: ${emailPayload.checkInTime}
- Morada: ${emailPayload.propertyAddress}
- Código de Acesso: ${emailPayload.accessCode}

${emailPayload.arrivalInstructions ? `Instruções de Chegada:\n${emailPayload.arrivalInstructions}\n` : ''}
Contactos:
- Telefone: ${emailPayload.propertyPhone}
- Email: ${emailPayload.propertyEmail}

${emailPayload.specialRequests ? `Pedidos Especiais: ${emailPayload.specialRequests}\n` : ''}
Se tiver alguma questão, não hesite em contactar-nos.

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    const content = `
      ${createMainTitle('Lembrete de Check-in')}
      
      ${createParagraph(`Olá <strong>${emailPayload.userName}</strong>,`)}
      
      ${createParagraph(`A sua estadia no <strong>${emailPayload.propertyName}</strong> aproxima-se! Estamos ansiosos por recebê-lo.`)}
      
      ${createDivider()}
      
      ${createSectionHeading('Detalhes da Reserva')}
      
      <div style="background-color: ${EMAIL_STYLES.colors.gold}; padding: 20px 25px; margin-bottom: 20px; border-left: 4px solid ${EMAIL_STYLES.colors.accent};">
        ${createDetailsTable(`
          ${createDetailRow('Check-in', checkInDate)}
          ${createDetailRow('Check-out', checkOutDate)}
          ${createDetailRow('Quarto', emailPayload.roomName)}
          ${createDetailRow('Hóspedes', `${emailPayload.guestsCount} ${emailPayload.guestsCount === 1 ? 'pessoa' : 'pessoas'}`)}
        `)}
      </div>
      
      ${createSectionHeading('Informações de Check-in')}
      
      ${createInfoBox(`
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>🕐 Horário de Check-in:</strong> ${emailPayload.checkInTime}
        </p>
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>📍 Morada:</strong> ${emailPayload.propertyAddress}
        </p>
        <p style="margin: 0; font-size: 18px; color: ${EMAIL_STYLES.colors.accent};">
          <strong>🔑 Código de Acesso: ${emailPayload.accessCode}</strong>
        </p>
      `)}
      
      ${
        emailPayload.arrivalInstructions
          ? `
        <div style="margin-top: 25px;">
          ${createSectionHeading('Instruções de Chegada')}
          <div style="background-color: ${EMAIL_STYLES.colors.gold}; padding: 20px 25px; border-left: 4px solid ${EMAIL_STYLES.colors.accent};">
            <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark}; line-height: 1.7; white-space: pre-line;">
              ${emailPayload.arrivalInstructions}
            </p>
          </div>
        </div>
      `
          : ''
      }
      
      ${createDivider()}
      
      ${createSectionHeading('Contactos')}
      
      ${createDetailsTable(`
        ${createDetailRow('Telefone', emailPayload.propertyPhone)}
        ${createDetailRow('Email', emailPayload.propertyEmail)}
      `)}
      
      ${
        emailPayload.specialRequests
          ? `
        <div style="margin-top: 25px;">
          ${createSectionHeading('Os Seus Pedidos Especiais')}
          ${createParagraph(emailPayload.specialRequests, 'muted')}
        </div>
      `
          : ''
      }
      
      ${createDivider()}
      
      <div style="text-align: center; margin: 30px 0;">
        ${createEmailButton('Ver a Minha Reserva', `${this.frontendUrl}/account`, 'secondary')}
      </div>
      
      ${createParagraph('Se tiver alguma questão ou precisar de alterar a sua reserva, não hesite em contactar-nos.', 'muted')}
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: `Lembrete: Check-in em ${emailPayload.propertyName} - The St. Anthony`,
      showFooterLinks: true,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: emailPayload.email,
      subject: `Lembrete de Check-in - ${emailPayload.propertyName}`,
      text,
      html,
    });
  }

  async sendCheckOutReminderEmail(
    emailPayload: CheckOutReminderEmail,
  ): Promise<void> {
    const checkOutDate = this.formatDate(emailPayload.checkOutDate);

    const text = `The St. Anthony

Lembrete de Check-out

Olá ${emailPayload.userName},

Esperamos que esteja a desfrutar da sua estadia no ${emailPayload.propertyName}!

Lembre-se que o check-out é hoje:
- Data: ${checkOutDate}
- Horário: até às ${emailPayload.checkOutTime}
- Quarto: ${emailPayload.roomName}

Obrigado por ter escolhido o The St. Anthony. Esperamos vê-lo novamente em breve!

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    const content = `
      ${createMainTitle('Lembrete de Check-out')}
      
      ${createParagraph(`Olá <strong>${emailPayload.userName}</strong>,`)}
      
      ${createParagraph(`Esperamos que esteja a desfrutar da sua estadia no <strong>${emailPayload.propertyName}</strong>!`)}
      
      ${createDivider()}
      
      ${createSectionHeading('Informações de Check-out')}
      
      ${createInfoBox(`
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>📅 Data:</strong> ${checkOutDate}
        </p>
        <p style="margin: 0 0 15px 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>🕐 Horário:</strong> até às ${emailPayload.checkOutTime}
        </p>
        <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>🛏️ Quarto:</strong> ${emailPayload.roomName}
        </p>
      `)}
      
      ${createDivider()}
      
      ${createParagraph('Obrigado por ter escolhido o <strong>The St. Anthony</strong>. Esperamos vê-lo novamente em breve!')}
      
      <div style="text-align: center; margin: 30px 0;">
        ${createEmailButton('Ver a Minha Conta', `${this.frontendUrl}/account`, 'secondary')}
      </div>
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: `Lembrete: Check-out hoje em ${emailPayload.propertyName}`,
      showFooterLinks: true,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: emailPayload.email,
      subject: `Lembrete de Check-out - ${emailPayload.propertyName}`,
      text,
      html,
    });
  }

  async sendPostStayEmail(emailPayload: PostStayEmail): Promise<void> {
    const checkInDate = this.formatDate(emailPayload.checkInDate);
    const checkOutDate = this.formatDate(emailPayload.checkOutDate);

    const text = `The St. Anthony

Obrigado pela sua estadia!

Olá ${emailPayload.userName},

Obrigado por ter escolhido o ${emailPayload.propertyName} para a sua estadia de ${checkInDate} a ${checkOutDate}.

Esperamos que tenha desfrutado de cada momento connosco. A sua opinião é muito importante para nós!

Se tiver algum comentário ou sugestão, gostaríamos muito de o ouvir. Pode partilhar a sua experiência através da sua área de cliente.

Esperamos vê-lo novamente em breve!

Com os melhores cumprimentos,
The St. Anthony Collection

---
Este é um email automático. Por favor, não responda.`;

    const content = `
      ${createMainTitle('Obrigado pela sua estadia!')}
      
      ${createParagraph(`Olá <strong>${emailPayload.userName}</strong>,`)}
      
      ${createParagraph(`Obrigado por ter escolhido o <strong>${emailPayload.propertyName}</strong> para a sua estadia.`)}
      
      <div style="background-color: ${EMAIL_STYLES.colors.gold}; padding: 20px 25px; margin: 25px 0; border-left: 4px solid ${EMAIL_STYLES.colors.accent};">
        ${createDetailsTable(`
          ${createDetailRow('Check-in', checkInDate)}
          ${createDetailRow('Check-out', checkOutDate)}
        `)}
      </div>
      
      ${createParagraph('Esperamos que tenha desfrutado de cada momento connosco. A sua opinião é muito importante para nós!')}
      
      ${createDivider()}
      
      ${createSectionHeading('Partilhe a sua experiência')}
      
      ${createParagraph('Se tiver algum comentário, sugestão ou quiser reportar algo sobre a sua estadia, gostaríamos muito de o ouvir.', 'muted')}
      
      <div style="text-align: center; margin: 35px 0;">
        ${createEmailButton('Partilhar Feedback', emailPayload.feedbackUrl || `${this.frontendUrl}/account/problems`)}
      </div>
      
      ${createDivider()}
      
      ${createInfoBox(`
        <p style="margin: 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textDark};">
          <strong>🌟 Esperamos vê-lo novamente em breve!</strong>
        </p>
        <p style="margin: 10px 0 0 0; font-size: 14px; color: ${EMAIL_STYLES.colors.textMuted};">
          Como nosso hóspede, terá sempre acesso a ofertas exclusivas nas suas próximas estadias.
        </p>
      `)}
    `;

    const html = createBaseEmailTemplate(content, {
      preheaderText: `Obrigado pela sua estadia em ${emailPayload.propertyName} - The St. Anthony`,
      showFooterLinks: true,
    });

    await this.sendEmail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: emailPayload.email,
      subject: `Obrigado pela sua estadia - ${emailPayload.propertyName}`,
      text,
      html,
    });
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

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
