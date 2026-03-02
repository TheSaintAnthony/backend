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

export interface ReportConfirmationData {
  reporterName: string;
  reporterEmail: string;
  subject: string;
  relationship: string;
  occurrenceDate: string;
  submittedAt: string;
  reportId: string;
}

export function createReportConfirmationTemplate(
  data: ReportConfirmationData,
): string {
  const content = `
    ${createMainTitle('Confirmação de Receção de Relato')}
    ${createParagraph(`Olá <strong>${data.reporterName}</strong>,`)}
    ${createParagraph('Confirmamos a receção do seu relato. A sua submissão será analisada pela nossa equipa com a máxima confidencialidade.')}
    ${createDivider()}
    ${createSectionHeading('Detalhes da Submissão')}
    ${createDetailsTable(`
      ${createDetailRow('Número de Referência', data.reportId)}
      ${createDetailRow('Data de Submissão', new Date(data.submittedAt).toLocaleDateString('pt-PT'))}
      ${createDetailRow('Data de Ocorrência', new Date(data.occurrenceDate).toLocaleDateString('pt-PT'))}
    `)}
    ${createInfoBox('Entraremos em contacto caso necessitemos de informações adicionais.')}
  `;

  return createBaseEmailTemplate(content, {
    preheaderText: 'Confirmação de Receção de Relato - The St. Anthony',
    showFooterLinks: false,
  });
}
