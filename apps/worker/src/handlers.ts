/**
 * Ablauf der Zahlung, unabhängig von der Worker-Laufzeit gehalten, damit er
 * ohne Cloudflare-Umgebung geprüft werden kann.
 */
import { isPaidStatus, PayrexxError } from './payrexx';
import type { PayrexxClient } from './payrexx';
import { createToken, hashConfig, verifyToken } from './tokens';

/** Kleinster gemeinsamer Nenner von KV, damit Tests ohne Cloudflare auskommen. */
export interface Store {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface PaymentRecord {
  configHash: string;
  gatewayId: number;
  paid: boolean;
  createdAt: number;
}

/** 30 Tage: so lange lässt sich ein bezahltes Heft erneut herunterladen. */
export const RECORD_TTL_SECONDS = 30 * 24 * 60 * 60;
const TOKEN_TTL_SECONDS = RECORD_TTL_SECONDS;

export interface Deps {
  store: Store;
  client: PayrexxClient;
  tokenSecret: string;
  priceRappen: number;
  currency: string;
  siteOrigin: string;
  now?: () => number;
}

const key = (paymentId: string): string => `payment:${paymentId}`;

export interface CheckoutResult {
  paymentId: string;
  url: string;
}

export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'RequestError';
  }
}

/**
 * Startet eine Zahlung: legt die Bezahlseite an und merkt sich, für welche
 * Heft-Konfiguration sie gilt.
 */
export async function startCheckout(
  deps: Deps,
  config: string,
  purpose: string,
): Promise<CheckoutResult> {
  if (typeof config !== 'string' || config.length === 0 || config.length > 20_000) {
    throw new RequestError('Ungültige Heft-Konfiguration', 400);
  }
  const configHash = await hashConfig(config);
  const paymentId = crypto.randomUUID();
  const returnUrl = `${deps.siteOrigin}/raetselheft?zahlung=${paymentId}`;

  let gateway;
  try {
    gateway = await deps.client.createGateway({
      amount: deps.priceRappen,
      currency: deps.currency,
      purpose: purpose.slice(0, 200),
      successRedirectUrl: `${returnUrl}&status=ok`,
      failedRedirectUrl: `${returnUrl}&status=fehler`,
      cancelRedirectUrl: `${returnUrl}&status=abbruch`,
      referenceId: configHash,
    });
  } catch (cause) {
    const status = cause instanceof PayrexxError ? 502 : 500;
    throw new RequestError('Die Bezahlseite konnte nicht erstellt werden', status);
  }

  const record: PaymentRecord = {
    configHash,
    gatewayId: gateway.id,
    paid: false,
    createdAt: (deps.now ?? Date.now)(),
  };
  await deps.store.put(key(paymentId), JSON.stringify(record), {
    expirationTtl: RECORD_TTL_SECONDS,
  });
  // Rückweg für die Payrexx-Meldung: sie kennt nur die Referenz.
  await deps.store.put(`hash:${configHash}`, paymentId, { expirationTtl: RECORD_TTL_SECONDS });
  return { paymentId, url: gateway.link };
}

async function readRecord(deps: Deps, paymentId: string): Promise<PaymentRecord | undefined> {
  const raw = await deps.store.get(key(paymentId));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PaymentRecord;
  } catch {
    return undefined;
  }
}

export interface StatusResult {
  paid: boolean;
  token?: string;
}

/**
 * Fragt den Stand ab. Solange nicht bezahlt ist, wird bei Payrexx nachgefragt;
 * das deckt auch den Fall ab, dass die Rückmeldung von Payrexx ausbleibt.
 */
export async function checkStatus(deps: Deps, paymentId: string): Promise<StatusResult> {
  const record = await readRecord(deps, paymentId);
  if (!record) throw new RequestError('Unbekannte Zahlung', 404);

  if (!record.paid) {
    try {
      const gateway = await deps.client.getGateway(record.gatewayId);
      if (isPaidStatus(gateway.status)) {
        record.paid = true;
        await deps.store.put(key(paymentId), JSON.stringify(record), {
          expirationTtl: RECORD_TTL_SECONDS,
        });
      }
    } catch {
      // Payrexx nicht erreichbar: als «noch nicht bezahlt» behandeln.
      return { paid: false };
    }
  }
  if (!record.paid) return { paid: false };

  const now = Math.floor((deps.now ?? Date.now)() / 1000);
  const token = await createToken(deps.tokenSecret, {
    paymentId,
    configHash: record.configHash,
    exp: now + TOKEN_TTL_SECONDS,
  });
  return { paid: true, token };
}

/**
 * Meldung von Payrexx: Zahlung als bezahlt vermerken. Der Haken beschleunigt
 * nur den Normalfall; massgeblich ist die Abfrage bei Payrexx in checkStatus,
 * die greift auch dann, wenn diese Meldung ausbleibt.
 */
export async function handleWebhook(deps: Deps, body: unknown): Promise<void> {
  const transaction = (body as { transaction?: { status?: string; referenceId?: string } })
    .transaction;
  if (!transaction?.referenceId || !isPaidStatus(transaction.status)) return;

  const paymentId = await deps.store.get(`hash:${transaction.referenceId}`);
  if (!paymentId) return;
  const record = await readRecord(deps, paymentId);
  if (!record) return;
  record.paid = true;
  await deps.store.put(key(paymentId), JSON.stringify(record), {
    expirationTtl: RECORD_TTL_SECONDS,
  });
}

/** Prüft ein Freischalt-Token gegen die Heft-Konfiguration. */
export async function unlock(deps: Deps, token: string, config: string): Promise<boolean> {
  const configHash = await hashConfig(config);
  const now = Math.floor((deps.now ?? Date.now)() / 1000);
  const payload = await verifyToken(deps.tokenSecret, token, configHash, now);
  if (!payload) return false;
  const record = await readRecord(deps, payload.paymentId);
  return record?.paid === true;
}
