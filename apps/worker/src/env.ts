/** Laufzeitumgebung des Workers. Geheimnisse kommen aus «wrangler secret». */
export interface Env {
  PAYMENTS: KVNamespace;
  /** Preis in Rappen, z. B. 500 für CHF 5.00. */
  PRICE_RAPPEN: string;
  CURRENCY: string;
  /** Erlaubte Herkunft der Website (CORS und Weiterleitungen). */
  SITE_ORIGIN: string;
  PAYREXX_API_VERSION: string;
  /** Instanzname vor «.payrexx.com». Fehlt er, ist die Zahlung abgeschaltet. */
  PAYREXX_INSTANCE?: string;
  /** API-Schlüssel der Instanz (Secret). */
  PAYREXX_API_KEY?: string;
  /** Schlüssel für die Freischalt-Token (Secret). */
  TOKEN_SECRET?: string;
  /** Nur für Tests und Abnahme: abweichender Payrexx-Host. */
  PAYREXX_BASE_URL?: string;
}
