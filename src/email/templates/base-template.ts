/**
 * Base email template for St. Anthony Hotel
 * Follows the website's luxury aesthetic with black/gold color scheme
 *
 * Brand Colors:
 * - Primary accent: #a18d6b (gold/taupe)
 * - Background gold: #f0ebe3
 * - Buttons: #e3d7c3
 * - Dark: #000000
 * - Text light: #ffffff
 */

export interface BaseEmailOptions {
  preheaderText?: string;
  showFooterLinks?: boolean;
}

export const EMAIL_STYLES = {
  // Colors matching the website
  colors: {
    primary: '#000000',
    accent: '#a18d6b',
    gold: '#f0ebe3',
    buttonBg: '#e3d7c3',
    white: '#ffffff',
    textDark: '#333333',
    textMuted: '#666666',
    textLight: '#999999',
    border: 'rgba(161, 141, 107, 0.3)',
  },
  // Typography
  fonts: {
    primary: "'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
    heading: "'Helvetica Neue', Helvetica, Arial, 'Lucida Grande', sans-serif",
  },
} as const;

/**
 * Creates a styled button for emails
 */
export function createEmailButton(
  text: string,
  href: string,
  style: 'primary' | 'secondary' = 'primary',
): string {
  const { colors } = EMAIL_STYLES;
  const isPrimary = style === 'primary';

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
      <tr>
        <td style="border-radius: 50px; background: ${isPrimary ? colors.primary : colors.buttonBg};">
          <a href="${href}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: ${EMAIL_STYLES.fonts.primary}; font-size: 12px; font-weight: 600; color: ${isPrimary ? colors.white : colors.primary}; text-decoration: none; text-transform: uppercase; letter-spacing: 1.5px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Creates a divider line
 */
export function createDivider(): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding: 30px 0;">
          <hr style="border: none; border-top: 1px solid ${EMAIL_STYLES.colors.border}; margin: 0;">
        </td>
      </tr>
    </table>
  `;
}

/**
 * Creates the base email template wrapper
 */
export function createBaseEmailTemplate(
  content: string,
  options: BaseEmailOptions = {},
): string {
  const { colors, fonts } = EMAIL_STYLES;
  const { preheaderText = '', showFooterLinks = true } = options;

  // Logo as base64 SVG data URI (white logo on dark background)
  const logoSvg = `
    <svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Helvetica Neue, Arial, sans-serif" font-size="24" 
            font-weight="300" letter-spacing="4" fill="#ffffff">
        THE ST. ANTHONY
      </text>
    </svg>
  `.trim();
  const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString('base64')}`;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>The St. Anthony</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
      .mobile-center { text-align: center !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.gold}; font-family: ${fonts.primary};">
  ${preheaderText ? `<div style="display: none; font-size: 1px; color: ${colors.gold}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${preheaderText}</div>` : ''}
  
  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${colors.gold};">
    <tr>
      <td style="padding: 40px 20px;">
        
        <!-- Email container -->
        <table role="presentation" class="email-container" style="max-width: 600px; margin: 0 auto; background-color: ${colors.white}; border-radius: 0;" width="100%" cellspacing="0" cellpadding="0" border="0">
          
          <!-- Header with logo -->
          <tr>
            <td style="background-color: ${colors.primary}; padding: 40px 30px; text-align: center;">
              <img src="${logoDataUri}" alt="The St. Anthony" width="200" height="40" style="display: block; margin: 0 auto; max-width: 200px; height: auto;">
            </td>
          </tr>
          
          <!-- Accent bar -->
          <tr>
            <td style="background-color: ${colors.accent}; height: 4px;"></td>
          </tr>
          
          <!-- Main content -->
          <tr>
            <td class="mobile-padding" style="padding: 50px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.primary}; padding: 40px 30px; text-align: center;">
              ${
                showFooterLinks
                  ? `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 20px;">
                <tr>
                  <td style="padding: 0 15px;">
                    <a href="#" style="color: ${colors.accent}; font-size: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Estadias</a>
                  </td>
                  <td style="color: ${colors.border};">|</td>
                  <td style="padding: 0 15px;">
                    <a href="#" style="color: ${colors.accent}; font-size: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Restaurantes</a>
                  </td>
                  <td style="color: ${colors.border};">|</td>
                  <td style="padding: 0 15px;">
                    <a href="#" style="color: ${colors.accent}; font-size: 12px; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">Contactos</a>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
              
              <p style="margin: 0 0 15px 0; color: ${colors.textLight}; font-size: 12px; line-height: 1.6;">
                The St. Anthony Collection © ${new Date().getFullYear()}
              </p>
              
              <p style="margin: 0; color: ${colors.textLight}; font-size: 11px; line-height: 1.6;">
                Esta é uma mensagem automática. Por favor, não responda a este email.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Creates a section heading
 */
export function createSectionHeading(text: string): string {
  const { colors, fonts } = EMAIL_STYLES;
  return `
    <h2 style="margin: 0 0 20px 0; font-family: ${fonts.heading}; font-size: 14px; font-weight: 600; color: ${colors.accent}; text-transform: uppercase; letter-spacing: 2px;">
      ${text}
    </h2>
  `;
}

/**
 * Creates a main title
 */
export function createMainTitle(text: string): string {
  const { colors, fonts } = EMAIL_STYLES;
  return `
    <h1 style="margin: 0 0 25px 0; font-family: ${fonts.heading}; font-size: 28px; font-weight: 300; color: ${colors.primary}; line-height: 1.3; letter-spacing: 1px;">
      ${text}
    </h1>
  `;
}

/**
 * Creates a paragraph
 */
export function createParagraph(
  text: string,
  style: 'normal' | 'muted' | 'small' = 'normal',
): string {
  const { colors, fonts } = EMAIL_STYLES;

  const styles = {
    normal: `color: ${colors.textDark}; font-size: 16px; line-height: 1.7;`,
    muted: `color: ${colors.textMuted}; font-size: 14px; line-height: 1.6;`,
    small: `color: ${colors.textLight}; font-size: 13px; line-height: 1.5;`,
  };

  return `
    <p style="margin: 0 0 20px 0; font-family: ${fonts.primary}; ${styles[style]}">
      ${text}
    </p>
  `;
}

/**
 * Creates an info box/card
 */
export function createInfoBox(content: string): string {
  const { colors } = EMAIL_STYLES;
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="background-color: ${colors.gold}; padding: 25px 30px; border-left: 4px solid ${colors.accent};">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

/**
 * Creates a detail row (label: value)
 */
export function createDetailRow(label: string, value: string): string {
  const { colors, fonts } = EMAIL_STYLES;
  return `
    <tr>
      <td style="padding: 10px 0; font-family: ${fonts.primary}; font-size: 14px; color: ${colors.textMuted}; vertical-align: top; width: 140px;">
        ${label}
      </td>
      <td style="padding: 10px 0; font-family: ${fonts.primary}; font-size: 14px; color: ${colors.textDark}; font-weight: 500; vertical-align: top;">
        ${value}
      </td>
    </tr>
  `;
}

/**
 * Creates a details table wrapper
 */
export function createDetailsTable(rows: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
      ${rows}
    </table>
  `;
}
