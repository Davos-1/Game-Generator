/**
 * Zahlungs-Worker: erstellt Payrexx-Bezahlseiten, nimmt deren Meldungen
 * entgegen und schaltet nach erfolgreicher Zahlung das wasserzeichenfreie PDF
 * frei. Ohne hinterlegte Zugangsdaten antwortet er mit 503; die Website zeigt
 * den Kauf dann gar nicht erst an.
 */
import type { Env } from './env';
import {
  checkStatus,
  handleWebhook,
  RequestError,
  startCheckout,
  unlock,
  type Deps,
} from './handlers';
import { PayrexxClient } from './payrexx';

const json = (data: unknown, status = 200, origin = '*'): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'cache-control': 'no-store',
    },
  });

function makeDeps(env: Env): Deps | undefined {
  if (!env.PAYREXX_INSTANCE || !env.PAYREXX_API_KEY || !env.TOKEN_SECRET) return undefined;
  return {
    store: env.PAYMENTS,
    client: new PayrexxClient({
      instance: env.PAYREXX_INSTANCE,
      apiKey: env.PAYREXX_API_KEY,
      version: env.PAYREXX_API_VERSION,
      ...(env.PAYREXX_BASE_URL ? { baseUrl: env.PAYREXX_BASE_URL } : {}),
    }),
    tokenSecret: env.TOKEN_SECRET,
    priceRappen: Number.parseInt(env.PRICE_RAPPEN, 10),
    currency: env.CURRENCY,
    siteOrigin: env.SITE_ORIGIN,
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = env.SITE_ORIGIN;

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, GET, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400',
        },
      });
    }

    // Preis und Verfügbarkeit; die Website fragt das beim Laden ab.
    if (url.pathname === '/api/config' && request.method === 'GET') {
      return json(
        {
          enabled: makeDeps(env) !== undefined,
          priceRappen: Number.parseInt(env.PRICE_RAPPEN, 10),
          currency: env.CURRENCY,
        },
        200,
        origin,
      );
    }

    const deps = makeDeps(env);
    if (!deps) {
      return json({ error: 'Die Zahlung ist noch nicht eingerichtet.' }, 503, origin);
    }

    try {
      if (url.pathname === '/api/checkout' && request.method === 'POST') {
        const body: { config?: string; purpose?: string } = await request.json();
        const result = await startCheckout(deps, body.config ?? '', body.purpose ?? 'Rätselheft');
        return json(result, 200, origin);
      }

      if (url.pathname === '/api/status' && request.method === 'GET') {
        const paymentId = url.searchParams.get('paymentId');
        if (!paymentId) throw new RequestError('paymentId fehlt', 400);
        return json(await checkStatus(deps, paymentId), 200, origin);
      }

      if (url.pathname === '/api/unlock' && request.method === 'POST') {
        const body: { token?: string; config?: string } = await request.json();
        const ok = await unlock(deps, body.token ?? '', body.config ?? '');
        return json({ ok }, ok ? 200 : 403, origin);
      }

      // Payrexx meldet sich hier; die Antwort muss schnell und schlicht sein.
      if (url.pathname === '/api/webhook' && request.method === 'POST') {
        await handleWebhook(deps, await request.json());
        return new Response('ok', { status: 200 });
      }
    } catch (cause) {
      if (cause instanceof RequestError) {
        return json({ error: cause.message }, cause.status, origin);
      }
      return json({ error: 'Unerwarteter Fehler' }, 500, origin);
    }

    return json({ error: 'Nicht gefunden' }, 404, origin);
  },
} satisfies ExportedHandler<Env>;
