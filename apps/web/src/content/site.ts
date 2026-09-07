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

/** Preise in Franken; müssen zu den Vorgaben des Zahlungs-Workers passen. */
export const PRICE_SINGLE_CHF = 2;
export const PRICE_BOOKLET_CHF = 5;
