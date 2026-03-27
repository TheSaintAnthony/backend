import {
  createBaseEmailTemplate,
  createDetailRow,
  createDivider,
  createInfoBox,
  createMainTitle,
  createParagraph,
  createSectionHeading,
  createDetailsTable,
} from './base-template';

export interface ReportStatusUpdateData {
  reporterName: string;
  reporterEmail: string;
  reportId: string;
  oldStatus: string;
  newStatus: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  reviewed: 'Em Revisão',
  resolved: 'Resolvido',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  reviewed:
    'O seu relato está a ser analisado pela nossa equipa. Seremos contactados caso necessitemos de informações adicionais.',
  resolved:
    'O seu relato foi analisado e considerado resolvido pela nossa equipa. Agradecemos a sua colaboração.',
};

export function createReportStatusUpdateTemplate(
  data: ReportStatusUpdateData,
): string {
  const statusLabel = STATUS_LABELS[data.newStatus] || data.newStatus;
  const statusDescription =
    STATUS_DESCRIPTIONS[data.newStatus] ||
    'O estado do seu relato foi atualizado.';

  const content = `
    ${createMainTitle('Atualização do Estado do seu Relato')}
    ${createParagraph(`Olá <strong>${data.reporterName}</strong>,`)}
    ${createParagraph('O estado do seu relato foi atualizado. Abaixo encontra os detalhes da atualização.')}
    ${createDivider()}
    ${createSectionHeading('Estado Atual')}
    ${createInfoBox(`
      <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333333;">
        ${statusLabel}
      </p>
    `)}
    ${createDivider()}
    ${createSectionHeading('Detalhes do Relato')}
    ${createDetailsTable(`
      ${createDetailRow('Número de Referência', data.reportId)}
      ${createDetailRow('Data de Atualização', new Date(data.updatedAt).toLocaleDateString('pt-PT'))}
    `)}
    ${createInfoBox(createParagraph(statusDescription, 'muted').replace('<p', '<p style="margin:0"'))}
  `;

  return createBaseEmailTemplate(content, {
    preheaderText: `Atualização do seu relato: ${statusLabel} - The St. Anthony`,
    showFooterLinks: false,
  });
}
