/**
 * Anbindung an den Zahlungs-Worker.
 *
 * Ohne konfigurierte Adresse (PUBLIC_PAYMENT_API) ist der Kauf abgeschaltet:
 * die Oberfläche zeigt dann nur die Vorschau mit Wasserzeichen.
 */
import type { BookletConfig } from './bookletConfig';
import { toCompact } from './bookletConfig';
import type { PuzzleConfig } from './puzzleConfig';
import { configToParams } from './puzzleConfig';

const API = import.meta.env.PUBLIC_PAYMENT_API ?? '';

/** Verkaufte Produkte: ein einzelnes Rätsel oder ein ganzes Heft. */
export type Product = 'single' | 'booklet';

export interface PaymentInfo {
  enabled: boolean;
  /** Preis je Produkt in Rappen. */
  prices: Record<Product, number>;
  currency: string;
}

/** Fallback-Preise, solange der Worker nicht antwortet. */
const OFFLINE: PaymentInfo = {
  enabled: false,
  prices: { single: 200, booklet: 500 },
  currency: 'CHF',
};

/**
 * Kennzeichnung einer Konfiguration. Genau dieselbe Zeichenkette wie beim
 * Kauf, sonst passt der Hash nicht. Das Produkt steht vorne, damit ein Heft
 * und ein Einzelrätsel nie denselben Schlüssel bekommen.
 */
export const bookletString = (config: BookletConfig): string =>
  `booklet:${JSON.stringify(toCompact(config))}`;

export const puzzleString = (config: PuzzleConfig): string =>
  `single:${config.kind}:${configToParams(config).toString()}`;

export const isConfigured = (): boolean => API.length > 0;

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  if (!isConfigured()) return OFFLINE;
  try {
    const response = await fetch(`${API}/api/config`);
    if (!response.ok) return OFFLINE;
    return (await response.json()) as PaymentInfo;
  } catch {
    return OFFLINE;
  }
}

export interface CheckoutOptions {
  config: string;
  purpose: string;
  product: Product;
  /** Seite, auf die nach der Zahlung zurückgesprungen wird, z. B. «/sudoku». */
  returnPath: string;
}

/** Startet den Kauf und liefert die Adresse der Bezahlseite. */
export async function startCheckout(
  options: CheckoutOptions,
): Promise<{ paymentId: string; url: string }> {
  const response = await fetch(`${API}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!response.ok) throw new Error('Der Kauf konnte nicht gestartet werden.');
  return (await response.json()) as { paymentId: string; url: string };
}

export async function fetchStatus(paymentId: string): Promise<{ paid: boolean; token?: string }> {
  const response = await fetch(`${API}/api/status?paymentId=${encodeURIComponent(paymentId)}`);
  if (!response.ok) return { paid: false };
  return (await response.json()) as { paid: boolean; token?: string };
}

/** Prüft beim Worker, ob das Token zu genau dieser Konfiguration gehört. */
export async function unlock(token: string, config: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const response = await fetch(`${API}/api/unlock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, config }),
    });
    if (!response.ok) return false;
    return ((await response.json()) as { ok: boolean }).ok;
  } catch {
    return false;
  }
}

const TOKEN_KEY = 'raetselheft:tokens';

/** Freigeschaltete Käufe: Konfiguration als Schlüssel, Token als Wert. */
function readTokens(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberToken(config: string, token: string): void {
  try {
    const tokens = readTokens();
    tokens[config] = token;
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    // Ohne Speicher bleibt die Freischaltung auf diese Sitzung beschränkt.
  }
}

export const tokenFor = (config: string): string | undefined => readTokens()[config];

/** Preis als Text, z. B. «CHF 5.00». */
export const formatPrice = (info: PaymentInfo, product: Product): string =>
  `${info.currency} ${(info.prices[product] / 100).toFixed(2)}`;
