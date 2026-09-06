/**
 * Freischalt-Token: signierte Bestätigung, dass für genau diese
 * Heft-Konfiguration bezahlt wurde. Ein reines Flag im Browser wäre über die
 * Entwicklerwerkzeuge fälschbar (PLAN.md Abschnitt 6.2).
 */

const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return toBase64Url(new Uint8Array(signature));
}

/** Vergleich in konstanter Zeit, damit die Signatur nicht erraten werden kann. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface TokenPayload {
  paymentId: string;
  /** Hash der Heft-Konfiguration; bindet das Token an genau dieses Heft. */
  configHash: string;
  /** Ablauf als Unix-Zeit in Sekunden. */
  exp: number;
}

export async function createToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = `${payload.paymentId}.${payload.configHash}.${payload.exp}`;
  return `${body}.${await hmac(secret, body)}`;
}

export async function verifyToken(
  secret: string,
  token: string,
  configHash: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<TokenPayload | undefined> {
  const parts = token.split('.');
  if (parts.length !== 4) return undefined;
  const [paymentId, hash, expText, signature] = parts as [string, string, string, string];
  const body = `${paymentId}.${hash}.${expText}`;
  if (!timingSafeEqual(signature, await hmac(secret, body))) return undefined;

  const exp = Number.parseInt(expText, 10);
  if (!Number.isFinite(exp) || exp <= now) return undefined;
  // Ein bezahltes Token darf kein anderes Heft freischalten.
  if (hash !== configHash) return undefined;
  return { paymentId, configHash: hash, exp };
}

/** Stabiler Hash einer Heft-Konfiguration (SHA-256, gekürzt). */
export async function hashConfig(config: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(config));
  return toBase64Url(new Uint8Array(digest)).slice(0, 32);
}
