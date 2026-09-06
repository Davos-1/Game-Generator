import deCH from './de-CH.json';

export type Locale = 'de-CH';
export const DEFAULT_LOCALE: Locale = 'de-CH';

type Messages = typeof deCH;
const messages: Record<Locale, Messages> = { 'de-CH': deCH };

/** Pfad wie "home.title"; gibt bei fehlendem Schlüssel den Schlüssel selbst zurück. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  const parts = key.split('.');
  let current: unknown = messages[locale];
  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return key;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}
