import {
  EMAIL_STYLES,
  createBaseEmailTemplate,
  createMainTitle,
  createParagraph,
  createSectionHeading,
  createDetailsTable,
  createDetailRow,
  createDivider,
  createEmailButton,
} from './base-template';

export interface ContactNotificationData {
  contactId: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message?: string;
  submittedAt: string;
  adminPanelUrl?: string;
}

export function createContactNotificationTemplate(
  data: ContactNotificationData,
): string {
  const { colors, fonts } = EMAIL_STYLES;

  // Format the submission date
  const submittedDate = new Date(data.submittedAt).toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Build details table rows
  let detailsRows = createDetailRow('Nome', data.name);
  detailsRows += createDetailRow('Email', data.email);

  if (data.phone) {
    detailsRows += createDetailRow('Telefone', data.phone);
  }

  if (data.subject) {
    detailsRows += createDetailRow('Assunto', data.subject);
  }

  detailsRows += createDetailRow('Data', submittedDate);

  // Main content
  const content = `
    ${createMainTitle('Novo Contacto Recebido')}

    ${createParagraph('Recebeu um novo contacto através do formulário de contacto do website. Os detalhes estão abaixo:', 'normal')}

    ${createDivider()}

    ${createSectionHeading('Informações do Contacto')}

    ${createDetailsTable(detailsRows)}

    ${
      data.message
        ? `
    ${createSectionHeading('Mensagem')}

    <div style="background-color: ${colors.gold}; padding: 25px 30px; border-left: 4px solid ${colors.accent}; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; font-family: ${fonts.primary}; font-size: 14px; color: ${colors.textDark}; line-height: 1.7; white-space: pre-wrap; word-wrap: break-word;">
        ${data.message}
      </p>
    </div>

    ${createDivider()}
    `
        : ''
    }

    ${
      data.adminPanelUrl
        ? createEmailButton('Ver no Admin Panel', data.adminPanelUrl, 'primary')
        : ''
    }

    ${createParagraph('Pode visualizar e responder a este contacto no admin panel.', 'small')}
  `;

  return createBaseEmailTemplate(content, {
    preheaderText: `Novo contacto de ${data.name}`,
    showFooterLinks: true,
  });
}
