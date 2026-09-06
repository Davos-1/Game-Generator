/**
 * Anbindung an den Zahlungs-Worker.
 *
 * Ohne konfigurierte Adresse (PUBLIC_PAYMENT_API) ist der Kauf abgeschaltet:
 * die Oberfläche zeigt dann nur die Vorschau mit Wasserzeichen.
 */
import type { BookletConfig } from './bookletConfig';
import { toCompact } from './bookletConfig';

const API = import.meta.env.PUBLIC_PAYMENT_API ?? '';

export interface PaymentInfo {
  enabled: boolean;
  priceRappen: number;
  currency: string;
}

/** Genau dieselbe Zeichenkette wie beim Kauf, sonst passt der Hash nicht. */
export const configString = (config: BookletConfig): string => JSON.stringify(toCompact(config));

export const isConfigured = (): boolean => API.length > 0;

export async function fetchPaymentInfo(): Promise<PaymentInfo> {
  if (!isConfigured()) return { enabled: false, priceRappen: 500, currency: 'CHF' };
  try {
    const response = await fetch(`${API}/api/config`);
    if (!response.ok) return { enabled: false, priceRappen: 500, currency: 'CHF' };
    return (await response.json()) as PaymentInfo;
  } catch {
    return { enabled: false, priceRappen: 500, currency: 'CHF' };
  }
}

/** Startet den Kauf und liefert die Adresse der Bezahlseite. */
export async function startCheckout(
  config: BookletConfig,
  purpose: string,
): Promise<{ paymentId: string; url: string }> {
  const response = await fetch(`${API}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ config: configString(config), purpose }),
  });
  if (!response.ok) throw new Error('Der Kauf konnte nicht gestartet werden.');
  return (await response.json()) as { paymentId: string; url: string };
}

export async function fetchStatus(paymentId: string): Promise<{ paid: boolean; token?: string }> {
  const response = await fetch(`${API}/api/status?paymentId=${encodeURIComponent(paymentId)}`);
  if (!response.ok) return { paid: false };
  return (await response.json()) as { paid: boolean; token?: string };
}

/** Prüft beim Worker, ob das Token zu genau diesem Heft gehört. */
export async function unlock(token: string, config: BookletConfig): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const response = await fetch(`${API}/api/unlock`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, config: configString(config) }),
    });
    if (!response.ok) return false;
    return ((await response.json()) as { ok: boolean }).ok;
  } catch {
    return false;
  }
}

const TOKEN_KEY = 'raetselheft:tokens';

/** Freigeschaltete Hefte: Konfiguration als Schlüssel, Token als Wert. */
function readTokens(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberToken(config: BookletConfig, token: string): void {
  try {
    const tokens = readTokens();
    tokens[configString(config)] = token;
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    // Ohne Speicher bleibt die Freischaltung auf diese Sitzung beschränkt.
  }
}

export const tokenFor = (config: BookletConfig): string | undefined =>
  readTokens()[configString(config)];

/** Preis als Text, z. B. «CHF 5.00». */
export const formatPrice = (info: PaymentInfo): string =>
  `${info.currency} ${(info.priceRappen / 100).toFixed(2)}`;
