import {
  createBaseEmailTemplate,
  createEmailButton,
  createMainTitle,
  createParagraph,
  createDivider,
  createInfoBox,
  EMAIL_STYLES,
} from '../templates';

export function buildPasswordResetEmailContent(
  url: string,
  expirationTime: string,
): { text: string; html: string } {
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

  return { text, html };
}

export function buildVerifyUserEmailContent(
  url: string,
  expirationTime: string,
): { text: string; html: string } {
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

  return { text, html };
}
