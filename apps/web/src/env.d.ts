/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Adresse des Zahlungs-Workers; leer bedeutet: Kauf abgeschaltet. */
  readonly PUBLIC_PAYMENT_API?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
