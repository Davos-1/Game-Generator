/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Adresse des Zahlungs-Workers; leer bedeutet: Kauf abgeschaltet. */
  readonly PUBLIC_PAYMENT_API?: string;
  /** Kennzeichen für Cloudflare Web Analytics; leer bedeutet: keine Statistik. */
  readonly PUBLIC_ANALYTICS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
