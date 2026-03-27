/**
 * Email template strings for all supported languages
 * Organized by email type and language
 */

export interface ReportConfirmationStrings {
  subject: string;
  greeting: string;
  reference: string;
  confirmation: string;
  nextSteps: string;
  confidence: string;
  closing: string;
  company: string;
}

export interface ContactConfirmationStrings {
  subject: string;
  greeting: string;
  confirmation: string;
  reference: string;
  response: string;
  contact: string;
  closing: string;
  company: string;
}

export const emailStrings = {
  pt: {
    reportConfirmation: {
      subject:
        'Confirmação de Receção de Denúncia - The St. Anthony Collection',
      greeting: 'Olá {name},',
      reference: 'Referência: {reportId}',
      confirmation:
        'Confirmamos a receção da sua denúncia. A sua submissão será analisada pela nossa equipa de Conformidade com a máxima confidencialidade.',
      nextSteps:
        'A investigação seguirá um processo estruturado: receção → avaliação inicial → investigação → ações corretivas → acompanhamento (conforme apropriado).',
      confidence:
        'Tem garantida a confidencialidade total de todas as suas informações pessoais em conformidade com o RGPD.',
      closing:
        'Obrigado por contribuir para a integridade da nossa organização.',
      company: 'The St. Anthony Collection',
    } as ReportConfirmationStrings,
    contactConfirmation: {
      subject: 'Confirmação de Contacto Recebido - The St. Anthony Collection',
      greeting: 'Olá {name},',
      confirmation:
        'Obrigado por nos contactar. Recebemos a sua mensagem e entraremos em contacto em breve.',
      reference: 'Referência da sua mensagem: {contactId}',
      response:
        'Geralmente respondemos no prazo de 24 horas durante dias úteis.',
      contact:
        'Se tiver dúvidas urgentes, pode contactar-nos diretamente em info@thestanthonyhotel.com',
      closing: 'Agradecemos o seu interesse e aguardamos poder ajudar-lhe.',
      company: 'The St. Anthony Collection',
    } as ContactConfirmationStrings,
  },
  en: {
    reportConfirmation: {
      subject: 'Report Confirmation - The St. Anthony Collection',
      greeting: 'Hello {name},',
      reference: 'Reference: {reportId}',
      confirmation:
        'We confirm receipt of your report. Your submission will be reviewed by our Compliance team with utmost confidentiality.',
      nextSteps:
        'The investigation will follow a structured process: receipt → initial assessment → investigation → corrective actions → follow-up (as appropriate).',
      confidence:
        'Your personal information is guaranteed complete confidentiality in accordance with GDPR regulations.',
      closing:
        'Thank you for contributing to the integrity of our organization.',
      company: 'The St. Anthony Collection',
    } as ReportConfirmationStrings,
    contactConfirmation: {
      subject: 'Contact Received - The St. Anthony Collection',
      greeting: 'Hello {name},',
      confirmation:
        'Thank you for contacting us. We have received your message and will get back to you shortly.',
      reference: 'Your message reference: {contactId}',
      response: 'We typically respond within 24 hours on business days.',
      contact:
        'For urgent inquiries, you can contact us directly at info@thestanthonyhotel.com',
      closing: 'We appreciate your interest and look forward to assisting you.',
      company: 'The St. Anthony Collection',
    } as ContactConfirmationStrings,
  },
  fr: {
    reportConfirmation: {
      subject: 'Confirmation de Signalement - The St. Anthony Collection',
      greeting: 'Bonjour {name},',
      reference: 'Référence : {reportId}',
      confirmation:
        'Nous confirmons la réception de votre signalement. Votre soumission sera examinée par notre équipe de Conformité en toute confidentialité.',
      nextSteps:
        "L'enquête suivra un processus structuré : réception → évaluation initiale → enquête → actions correctives → suivi (le cas échéant).",
      confidence:
        "Vos informations personnelles bénéficient d'une confidentialité totale en conformité avec le RGPD.",
      closing: "Merci de contribuer à l'intégrité de notre organisation.",
      company: 'The St. Anthony Collection',
    } as ReportConfirmationStrings,
    contactConfirmation: {
      subject: 'Contact Reçu - The St. Anthony Collection',
      greeting: 'Bonjour {name},',
      confirmation:
        'Merci de nous avoir contactés. Nous avons reçu votre message et vous répondrons bientôt.',
      reference: 'Référence de votre message : {contactId}',
      response: 'Nous répondons généralement dans les 24 heures ouvrables.',
      contact:
        'Pour les demandes urgentes, vous pouvez nous contacter directement à info@thestanthonyhotel.com',
      closing:
        'Nous apprécions votre intérêt et attendons avec impatience de vous aider.',
      company: 'The St. Anthony Collection',
    } as ContactConfirmationStrings,
  },
  de: {
    reportConfirmation: {
      subject: 'Meldungsbestätigung - The St. Anthony Collection',
      greeting: 'Hallo {name},',
      reference: 'Referenz: {reportId}',
      confirmation:
        'Wir bestätigen den Erhalt Ihrer Meldung. Ihre Einreichung wird von unserem Compliance-Team mit äußerster Vertraulichkeit überprüft.',
      nextSteps:
        'Die Untersuchung folgt einem strukturierten Prozess: Eingang → Erstbewertung → Untersuchung → Korrekturmaßnahmen → Nachverfolgung (falls erforderlich).',
      confidence:
        'Ihre persönlichen Daten unterliegen vollständiger Vertraulichkeit gemäß DSGVO.',
      closing: 'Danke, dass Sie zur Integrität unserer Organisation beitragen.',
      company: 'The St. Anthony Collection',
    } as ReportConfirmationStrings,
    contactConfirmation: {
      subject: 'Kontakt erhalten - The St. Anthony Collection',
      greeting: 'Hallo {name},',
      confirmation:
        'Danke, dass Sie uns kontaktiert haben. Wir haben Ihre Nachricht erhalten und werden uns bald bei Ihnen melden.',
      reference: 'Referenz Ihrer Nachricht: {contactId}',
      response:
        'Wir antworten normalerweise innerhalb von 24 Stunden an Geschäftstagen.',
      contact:
        'Bei dringenden Anfragen können Sie uns direkt unter info@thestanthonyhotel.com kontaktieren',
      closing:
        'Wir schätzen Ihr Interesse und freuen uns, Ihnen helfen zu können.',
      company: 'The St. Anthony Collection',
    } as ContactConfirmationStrings,
  },
};
