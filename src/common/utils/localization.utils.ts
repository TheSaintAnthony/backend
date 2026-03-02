/**
 * Localization utilities for handling multi-language content
 * Provides functions to retrieve localized fields and map entities with translations
 */

/**
 * Get a localized field value from an entity
 * Returns the translated version for the specified locale, or falls back to Portuguese
 *
 * @param entity - The database entity containing localized fields
 * @param fieldName - The base field name (e.g., 'name', 'description')
 * @param locale - The requested locale ('pt', 'en', 'fr', 'de')
 * @returns The localized field value
 */
export function getLocalizedField<T extends Record<string, any>>(
  entity: T,
  fieldName: string,
  locale: string,
): string | null {
  // For Portuguese, use the base field name
  if (locale === 'pt' || !locale) {
    return entity[fieldName] || null;
  }

  // For other locales, try the locale-specific field first
  const localeField = `${fieldName}_${locale}`;
  const value = entity[localeField];

  // Fallback to Portuguese if translation missing
  return value || entity[fieldName] || null;
}

/**
 * Map entity fields to their localized versions
 * Creates a new object with specified fields replaced by their localized values
 *
 * @param entity - The database entity
 * @param locale - The requested locale
 * @param fields - Array of field names to localize
 * @returns New object with localized fields
 */
export function mapLocalizedEntity<T extends Record<string, any>>(
  entity: T,
  locale: string,
  fields: string[],
): T {
  if (locale === 'pt' || !locale) {
    return entity;
  }

  const mapped: Record<string, any> = { ...entity };

  fields.forEach((field) => {
    const localeField = `${field}_${locale}`;
    // Replace the field with localized value if it exists, otherwise keep original
    if (mapped[localeField]) {
      mapped[field] = mapped[localeField];
    }
  });

  return mapped as T;
}

/**
 * Extract locale from Accept-Language header
 * Returns a supported locale or defaults to Portuguese
 *
 * @param acceptLanguage - Accept-Language header value
 * @returns Valid locale code ('pt', 'en', 'fr', 'de')
 */
export function extractLocaleFromHeader(acceptLanguage?: string): string {
  if (!acceptLanguage) return 'pt';

  const locales = ['pt', 'en', 'fr', 'de'];
  const requestedLocales = acceptLanguage
    .split(',')
    .map((lang) => lang.split('-')[0].toLowerCase().trim());

  for (const lang of requestedLocales) {
    if (locales.includes(lang)) {
      return lang;
    }
  }

  return 'pt';
}

/**
 * Validate that a locale is supported
 *
 * @param locale - The locale to validate
 * @returns True if locale is supported
 */
export function isSupportedLocale(locale: string): boolean {
  return ['pt', 'en', 'fr', 'de'].includes(locale);
}

/**
 * Normalize locale to a supported value
 *
 * @param locale - The locale to normalize
 * @returns A supported locale or 'pt' as default
 */
export function normalizeLocale(locale?: string): string {
  if (!locale) return 'pt';
  if (isSupportedLocale(locale)) return locale;
  return 'pt';
}
