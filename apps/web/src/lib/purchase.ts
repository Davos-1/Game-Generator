/**
 * Gemeinsamer Kauf-Ablauf für Einzelrätsel und Heft: Preis abfragen,
 * Bezahlseite öffnen, nach der Rückkehr freischalten und die Freischaltung
 * für den nächsten Besuch merken.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import {
  fetchPaymentInfo,
  fetchStatus,
  formatPrice,
  isConfigured,
  rememberToken,
  startCheckout,
  tokenFor,
  unlock,
  type PaymentInfo,
  type Product,
} from './payment';

const OFFLINE: PaymentInfo = {
  enabled: false,
  prices: { single: 200, booklet: 500 },
  currency: 'CHF',
};

/**
 * Welche Konfiguration eine laufende Zahlung freischaltet. Steht im Speicher,
 * weil der Besucher zwischendurch auf der Payrexx-Seite ist: nach der Rückkehr
 * ist so ohne Zeitrennen klar, wofür das Token gilt.
 */
const PENDING_KEY = 'raetselheft:pending';

function readPending(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function rememberPending(paymentId: string, config: string): void {
  try {
    window.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ ...readPending(), [paymentId]: config }),
    );
  } catch {
    // Ohne Speicher greift der Rückfall auf die aktuelle Konfiguration.
  }
}

export interface Purchase {
  /** Kauf ist eingerichtet und der Worker erreichbar. */
  enabled: boolean;
  /** Preis als Text, z. B. «CHF 2.00». */
  price: string;
  /** Diese Konfiguration ist bezahlt: das saubere PDF ist frei. */
  unlocked: boolean;
  /** Meldung zur Zahlung, leer wenn es nichts zu sagen gibt. */
  note: string;
  busy: boolean;
  buy: (purpose: string) => Promise<void>;
}

export interface PurchaseOptions {
  product: Product;
  /** Seite, auf die Payrexx zurückführt, z. B. «/sudoku». */
  returnPath: string;
  /** Kennzeichnung der Konfiguration; siehe payment.ts. */
  config: string;
}

export function usePurchase({ product, returnPath, config }: PurchaseOptions): Purchase {
  const [info, setInfo] = useState<PaymentInfo>(OFFLINE);
  const [unlocked, setUnlocked] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Rückfall, falls die laufende Zahlung nicht im Speicher steht.
  const configRef = useRef(config);
  configRef.current = config;

  // Beim Start: Preis holen und eine Rückkehr von der Bezahlseite abwickeln.
  useEffect(() => {
    // Synchron lesen: der Generator ersetzt die Adresse gleich durch die
    // Einstellungen, danach wäre der Zahlungs-Parameter weg.
    const params = new URLSearchParams(window.location.search);
    void (async () => {
      setInfo(await fetchPaymentInfo());
      const paymentId = params.get('zahlung');
      if (!paymentId) return;
      if (params.get('status') === 'abbruch') {
        setNote(t('payment.cancelled'));
        return;
      }
      for (let attempt = 0; attempt < 8; attempt++) {
        const status = await fetchStatus(paymentId);
        if (status.paid && status.token) {
          rememberToken(readPending()[paymentId] ?? configRef.current, status.token);
          setNote(t('payment.done'));
          setUnlocked(true);
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      setNote(t('payment.pending'));
    })();
  }, []);

  // Die Freischaltung gilt für genau diese Konfiguration.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const token = tokenFor(config);
      const ok = token ? await unlock(token, config) : false;
      if (!cancelled) setUnlocked(ok);
    })();
    return () => {
      cancelled = true;
    };
  }, [config, note]);

  const buy = useCallback(
    async (purpose: string): Promise<void> => {
      setBusy(true);
      setNote('');
      try {
        const { paymentId, url } = await startCheckout({
          config,
          purpose,
          product,
          returnPath,
        });
        rememberPending(paymentId, config);
        window.location.href = url;
      } catch (cause) {
        setNote(cause instanceof Error ? cause.message : t('generator.common.error'));
        setBusy(false);
      }
    },
    [config, product, returnPath],
  );

  return {
    enabled: isConfigured() && info.enabled,
    price: formatPrice(info, product),
    unlocked,
    note,
    busy,
    buy,
  };
}
