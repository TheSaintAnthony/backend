/**
 * Supported locales for content localization.
 * Portuguese (pt) is the default/source of truth.
 */
export const SUPPORTED_LOCALES = ['pt', 'en', 'fr', 'de'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Localizes a single translatable field.
 * Falls back to Portuguese (default) if translation not available.
 */
function getLocalizedValue<T extends string | null | undefined>(
  entity: Record<string, unknown>,
  baseKey: string,
  locale: string | undefined,
): T | undefined {
  if (!locale || locale === 'pt') {
    return (entity[baseKey] as T) ?? undefined;
  }
  const suffix = locale.charAt(0).toUpperCase() + locale.slice(1);
  const localizedKey = `${baseKey}${suffix}`;
  const translated = entity[localizedKey];
  if (translated != null && translated !== '') {
    return translated as T;
  }
  return (entity[baseKey] as T) ?? undefined;
}

/**
 * Localizes residence/residence-unit fields based on requested locale.
 */
export function localizeResidence<T extends Record<string, unknown>>(
  entity: T,
  locale?: string,
): T {
  if (!entity || !locale || locale === 'pt') {
    return entity;
  }
  return {
    ...entity,
    name: getLocalizedValue(entity, 'name', locale) ?? entity.name,
    description: getLocalizedValue(entity, 'description', locale) ?? entity.description,
    about: getLocalizedValue(entity, 'about', locale) ?? entity.about,
  } as T;
}

/**
 * Localizes residence unit fields based on requested locale.
 */
export function localizeResidenceUnit<T extends Record<string, unknown>>(
  entity: T,
  locale?: string,
): T {
  if (!entity || !locale || locale === 'pt') {
    return entity;
  }
  return {
    ...entity,
    name: getLocalizedValue(entity, 'name', locale) ?? entity.name,
    description: getLocalizedValue(entity, 'description', locale) ?? entity.description,
  } as T;
}

/**
 * Localizes property fields (name, description, about, arrivalInstructions) based on locale.
 */
export function localizeProperty<T extends Record<string, unknown>>(
  entity: T,
  locale?: string,
): T {
  if (!entity || !locale || locale === 'pt') {
    return entity;
  }
  return {
    ...entity,
    name: getLocalizedValue(entity, 'name', locale) ?? entity.name,
    description: getLocalizedValue(entity, 'description', locale) ?? entity.description,
    about: getLocalizedValue(entity, 'about', locale) ?? entity.about,
    arrivalInstructions:
      getLocalizedValue(entity, 'arrivalInstructions', locale) ?? entity.arrivalInstructions,
  } as T;
}

/**
 * Localizes room fields (name, description) based on locale.
 */
export function localizeRoom<T extends Record<string, unknown>>(
  entity: T,
  locale?: string,
): T {
  if (!entity || !locale || locale === 'pt') {
    return entity;
  }
  return {
    ...entity,
    name: getLocalizedValue(entity, 'name', locale) ?? entity.name,
    description: getLocalizedValue(entity, 'description', locale) ?? entity.description,
  } as T;
}

/**
 * Parses Accept-Language header and returns supported locale.
 * Defaults to 'pt' if locale not supported.
 */
export function parseAcceptLanguage(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) return 'pt';
  const primaryLocale = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(primaryLocale as SupportedLocale)
    ? (primaryLocale as SupportedLocale)
    : 'pt';
}
