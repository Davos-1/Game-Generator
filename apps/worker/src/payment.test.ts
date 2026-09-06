import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkStatus,
  handleWebhook,
  RECORD_TTL_SECONDS,
  RequestError,
  startCheckout,
  unlock,
  type Deps,
  type Store,
} from './handlers';
import { isPaidStatus, PayrexxClient } from './payrexx';
import { createToken, hashConfig, verifyToken } from './tokens';

/** KV-Ersatz für Tests, merkt sich auch die gesetzte Lebensdauer. */
function memoryStore(): Store & { entries: Map<string, { value: string; ttl?: number }> } {
  const entries = new Map<string, { value: string; ttl?: number }>();
  return {
    entries,
    get: (key) => Promise.resolve(entries.get(key)?.value ?? null),
    put: (key, value, options) => {
      entries.set(key, {
        value,
        ...(options?.expirationTtl ? { ttl: options.expirationTtl } : {}),
      });
      return Promise.resolve();
    },
  };
}

const CONFIG = '{"th":"piraten","t":"Rätselheft","e":[{"k":"maze","s":"abc"}]}';
const SECRET = 'test-geheimnis';

interface Scenario {
  deps: Deps;
  store: ReturnType<typeof memoryStore>;
  fetchMock: ReturnType<typeof vi.fn>;
  gatewayStatus: { value: string };
}

function scenario(now = 1_800_000_000_000): Scenario {
  const store = memoryStore();
  const gatewayStatus = { value: 'waiting' };
  const fetchMock = vi.fn((input: string, init?: RequestInit) => {
    const url = input;
    if (init?.method === 'POST') {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: 'success',
            data: [{ id: 4711, hash: 'h', link: 'https://pay.example/4711', status: 'waiting' }],
          }),
        ),
      );
    }
    if (url.includes('/Gateway/4711/')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ status: 'success', data: [{ id: 4711, status: gatewayStatus.value }] }),
        ),
      );
    }
    return Promise.resolve(new Response(JSON.stringify({ message: 'unbekannt' }), { status: 404 }));
  });

  const deps: Deps = {
    store,
    client: new PayrexxClient({
      instance: 'demo',
      apiKey: 'key',
      version: 'v1.15',
      fetchImpl: fetchMock as unknown as typeof fetch,
    }),
    tokenSecret: SECRET,
    priceRappen: 500,
    currency: 'CHF',
    siteOrigin: 'https://raetselheft.ch',
    now: () => now,
  };
  return { deps, store, fetchMock, gatewayStatus };
}

describe('Token', () => {
  it('bestätigt ein gültiges Token für dieselbe Konfiguration', async () => {
    const hash = await hashConfig(CONFIG);
    const token = await createToken(SECRET, { paymentId: 'p1', configHash: hash, exp: 2000 });
    expect(await verifyToken(SECRET, token, hash, 1000)).toMatchObject({ paymentId: 'p1' });
  });

  it('weist ein Token für ein anderes Heft ab', async () => {
    const token = await createToken(SECRET, {
      paymentId: 'p1',
      configHash: await hashConfig(CONFIG),
      exp: 2000,
    });
    const other = await hashConfig('{"anderes":"heft"}');
    expect(await verifyToken(SECRET, token, other, 1000)).toBeUndefined();
  });

  it('weist abgelaufene, verfälschte und fremd signierte Token ab', async () => {
    const hash = await hashConfig(CONFIG);
    const token = await createToken(SECRET, { paymentId: 'p1', configHash: hash, exp: 2000 });
    expect(await verifyToken(SECRET, token, hash, 2001)).toBeUndefined();
    expect(await verifyToken(SECRET, `${token}x`, hash, 1000)).toBeUndefined();
    expect(await verifyToken('anderes-geheimnis', token, hash, 1000)).toBeUndefined();
    // Verlängerte Gültigkeit ohne passende Signatur bringt nichts.
    const [id, h, , sig] = token.split('.');
    expect(await verifyToken(SECRET, `${id}.${h}.9999999999.${sig}`, hash, 1000)).toBeUndefined();
  });

  it('erzeugt für gleiche Eingaben denselben Hash', async () => {
    expect(await hashConfig(CONFIG)).toBe(await hashConfig(CONFIG));
    expect(await hashConfig(CONFIG)).not.toBe(await hashConfig(`${CONFIG} `));
  });
});

describe('Payrexx-Status', () => {
  it('erkennt bezahlte Zustände', () => {
    expect(isPaidStatus('confirmed')).toBe(true);
    expect(isPaidStatus('authorized')).toBe(true);
    expect(isPaidStatus('waiting')).toBe(false);
    expect(isPaidStatus('cancelled')).toBe(false);
    expect(isPaidStatus(undefined)).toBe(false);
  });
});

describe('Kauf-Ablauf', () => {
  let s: Scenario;
  beforeEach(() => {
    s = scenario();
  });

  it('legt eine Bezahlseite an und merkt sich die Konfiguration', async () => {
    const result = await startCheckout(s.deps, CONFIG, 'Piraten-Rätselheft');
    expect(result.url).toBe('https://pay.example/4711');

    const request = s.fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit & { body: string },
    ];
    expect(request[0]).toContain('/v1.15/Gateway/?instance=demo');
    expect((request[1].headers as Record<string, string>)['x-api-key']).toBe('key');
    const body = JSON.parse(request[1].body) as Record<string, unknown>;
    expect(body.amount).toBe(500);
    expect(body.currency).toBe('CHF');
    expect(body.referenceId).toBe(await hashConfig(CONFIG));
    expect(String(body.successRedirectUrl)).toContain(result.paymentId);

    const stored = s.store.entries.get(`payment:${result.paymentId}`);
    expect(stored?.ttl).toBe(RECORD_TTL_SECONDS);
    expect(JSON.parse(stored?.value ?? '{}')).toMatchObject({ paid: false, gatewayId: 4711 });
  });

  it('weist leere und masslose Konfigurationen ab', async () => {
    await expect(startCheckout(s.deps, '', 'X')).rejects.toBeInstanceOf(RequestError);
    await expect(startCheckout(s.deps, 'x'.repeat(20_001), 'X')).rejects.toBeInstanceOf(
      RequestError,
    );
  });

  it('meldet einen Fehler, wenn Payrexx nicht mitspielt', async () => {
    const broken = scenario();
    broken.fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'nope' }), { status: 400 }),
    );
    await expect(startCheckout(broken.deps, CONFIG, 'X')).rejects.toMatchObject({ status: 502 });
  });

  it('gibt vor der Zahlung kein Token heraus', async () => {
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    expect(await checkStatus(s.deps, paymentId)).toEqual({ paid: false });
  });

  it('schaltet nach bestätigter Zahlung frei', async () => {
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    s.gatewayStatus.value = 'confirmed';
    const status = await checkStatus(s.deps, paymentId);
    expect(status.paid).toBe(true);
    expect(status.token).toBeDefined();
    expect(await unlock(s.deps, status.token as string, CONFIG)).toBe(true);
  });

  it('schaltet mit einem fremden Heft nicht frei', async () => {
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    s.gatewayStatus.value = 'confirmed';
    const { token } = await checkStatus(s.deps, paymentId);
    expect(await unlock(s.deps, token as string, '{"anderes":"heft"}')).toBe(false);
    expect(await unlock(s.deps, 'erfunden.token.123.xyz', CONFIG)).toBe(false);
  });

  it('behandelt eine unerreichbare Payrexx-Schnittstelle als «noch nicht bezahlt»', async () => {
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    s.fetchMock.mockRejectedValue(new Error('Netzwerk weg'));
    expect(await checkStatus(s.deps, paymentId)).toEqual({ paid: false });
  });

  it('kennt unbekannte Zahlungen nicht', async () => {
    await expect(checkStatus(s.deps, 'gibt-es-nicht')).rejects.toMatchObject({ status: 404 });
  });

  it('bleibt bei doppelter Abfrage stabil', async () => {
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    s.gatewayStatus.value = 'confirmed';
    const first = await checkStatus(s.deps, paymentId);
    const second = await checkStatus(s.deps, paymentId);
    expect(second.paid).toBe(true);
    expect(second.token).toBe(first.token);
    // Nach dem ersten «bezahlt» wird Payrexx nicht mehr gefragt.
    const calls = s.fetchMock.mock.calls.length;
    await checkStatus(s.deps, paymentId);
    expect(s.fetchMock.mock.calls.length).toBe(calls);
  });
});

describe('Meldung von Payrexx', () => {
  it('markiert die Zahlung als bezahlt', async () => {
    const s = scenario();
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    await handleWebhook(s.deps, {
      transaction: { status: 'confirmed', referenceId: await hashConfig(CONFIG) },
    });
    const stored = JSON.parse(s.store.entries.get(`payment:${paymentId}`)?.value ?? '{}') as {
      paid: boolean;
    };
    expect(stored.paid).toBe(true);
  });

  it('ignoriert unbezahlte und unbekannte Meldungen', async () => {
    const s = scenario();
    const { paymentId } = await startCheckout(s.deps, CONFIG, 'X');
    await handleWebhook(s.deps, {
      transaction: { status: 'cancelled', referenceId: await hashConfig(CONFIG) },
    });
    await handleWebhook(s.deps, { transaction: { status: 'confirmed', referenceId: 'unbekannt' } });
    await handleWebhook(s.deps, {});
    const stored = JSON.parse(s.store.entries.get(`payment:${paymentId}`)?.value ?? '{}') as {
      paid: boolean;
    };
    expect(stored.paid).toBe(false);
  });
});
