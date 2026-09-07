/** Angaben des Betreibers; erscheinen in Impressum, Datenschutz und AGB. */
export const OPERATOR = {
  name: 'Gian Blaser',
  street: 'Horwerstrasse 92',
  postalCode: '6010',
  city: 'Kriens',
  country: 'Schweiz',
  email: 'gian.blaser@gmail.com',
  /** Kein Handelsregistereintrag (Einzelunternehmen unter CHF 100 000 Umsatz). */
  commercialRegister: undefined as string | undefined,
} as const;

export const PRICE_CHF = 5;
