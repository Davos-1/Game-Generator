/**
 * Payrexx-Anbindung.
 *
 * Belegt anhand des offiziellen PHP-SDK (payrexx/payrexx-php):
 * - URL: https://api.payrexx.com/<version>/<Modell>/<id>/
 * - Anmeldung über den Kopfzeilen-Eintrag «x-api-key» mit dem API-Schlüssel
 * - Der Instanzname steht als Abfrageparameter «instance» in der URL
 * - Antworten haben die Form { data: [ … ] }, Fehler enthalten «message»
 */

export interface GatewayRequest {
  /** Betrag in Rappen. */
  amount: number;
  currency: string;
  purpose: string;
  successRedirectUrl: string;
  failedRedirectUrl: string;
  cancelRedirectUrl: string;
  /** Eigene Referenz; hier der Hash der Heft-Konfiguration. */
  referenceId: string;
}

export interface Gateway {
  id: number;
  hash: string;
  /** Bezahlseite, auf die der Nutzer geschickt wird. */
  link: string;
  status: string;
}

/** Zustände, die Payrexx als bezahlt betrachtet. */
const PAID_STATES = new Set(['confirmed', 'authorized', 'reserved', 'uncaptured']);

export const isPaidStatus = (status: string | undefined): boolean =>
  typeof status === 'string' && PAID_STATES.has(status.toLowerCase());

export interface PayrexxConfig {
  instance: string;
  apiKey: string;
  /** API-Version, z. B. «v1.15». */
  version: string;
  /** Für Tests: eigener fetch-Ersatz. */
  fetchImpl?: typeof fetch;
  /** Für Tests: abweichender Basis-Host. */
  baseUrl?: string;
}

export class PayrexxError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'PayrexxError';
  }
}

export class PayrexxClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly config: PayrexxConfig) {
    // In der Workers-Laufzeit muss fetch an globalThis gebunden bleiben,
    // sonst wirft der Aufruf «Illegal invocation».
    this.fetchImpl = config.fetchImpl ?? fetch.bind(globalThis);
  }

  private url(model: string, id?: string | number): string {
    const base = this.config.baseUrl ?? 'https://api.payrexx.com';
    const path = id === undefined ? `${model}/` : `${model}/${id}/`;
    return `${base}/${this.config.version}/${path}?instance=${encodeURIComponent(this.config.instance)}`;
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await this.fetchImpl(url, {
      ...init,
      headers: {
        'x-api-key': this.config.apiKey,
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new PayrexxError(
        `Unlesbare Antwort von Payrexx: ${text.slice(0, 120)}`,
        response.status,
      );
    }
    const body = parsed as { data?: unknown[]; message?: string };
    if (!response.ok || !Array.isArray(body.data)) {
      throw new PayrexxError(body.message ?? 'Payrexx meldet einen Fehler', response.status);
    }
    return body.data[0] as T;
  }

  /** Legt eine Bezahlseite an und liefert Id und Link. */
  async createGateway(request: GatewayRequest): Promise<Gateway> {
    return this.request<Gateway>(this.url('Gateway'), {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /** Fragt den Stand einer Bezahlseite ab. */
  async getGateway(id: number | string): Promise<Gateway> {
    return this.request<Gateway>(this.url('Gateway', id), { method: 'GET' });
  }
}
