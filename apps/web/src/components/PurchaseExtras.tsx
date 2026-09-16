/**
 * Zwei kleine Bausteine rund um den Kauf, die Einzelrätsel und Heft
 * gemeinsam nutzen: die Zustimmung zur sofortigen Bereitstellung vor dem
 * Kauf und der Wiederherstellungs-Link danach.
 */
import { useCallback, useState } from 'react';
import { t } from '../i18n';
import { restoreUrl } from '../lib/payment';

const smallButton =
  'rounded-group border border-line-strong px-3 py-2 text-sm hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50';

interface ConsentBoxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * Pflicht-Häkchen vor dem Kauf: digitale Inhalte werden sofort
 * bereitgestellt, das Widerrufsrecht erlischt damit (AGB Ziffer 8). Ohne
 * Häkchen bleibt der Kauf-Knopf gesperrt, und auch der Worker lehnt ab.
 */
export function ConsentBox({ checked, onChange }: ConsentBoxProps): React.ReactElement {
  return (
    <div className="rounded-group border border-line bg-surface p-3">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-accent-deep"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{t('payment.consentLabel')}</span>
      </label>
      <p className="mt-2 text-sm text-muted">
        {t('payment.consentHint')}{' '}
        <a className="underline" href="/agb#widerruf">
          {t('payment.consentLink')}
        </a>
      </p>
    </div>
  );
}

interface RestoreLinkProps {
  paymentId: string;
  /**
   * Einstellungen als Abfrage für den Link, z. B. «g=12&s=7». Fehlt der Wert,
   * lässt sich der Kauf nicht in einen Link fassen (zu umfangreiches Heft);
   * dann bleibt die Kaufnummer für den Support.
   */
  query: string | undefined;
}

/**
 * Link, der denselben Kauf auf einem anderen Gerät wieder freischaltet. Ohne
 * ihn hängt die Freischaltung am Speicher dieses Browsers.
 */
export function RestoreLink({ paymentId, query }: RestoreLinkProps): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const url = query === undefined ? undefined : restoreUrl(paymentId, query);

  const copy = useCallback(async (): Promise<void> => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [url]);

  return (
    <div className="rounded-group border border-line bg-surface p-3">
      <p className="font-semibold">{t('payment.restoreTitle')}</p>
      {url ? (
        <>
          <p className="mt-1 text-sm text-muted">{t('payment.restoreHint')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" className={smallButton} onClick={() => void copy()}>
              {copied ? t('payment.restoreCopied') : t('payment.restoreCopy')}
            </button>
            <input
              type="text"
              readOnly
              value={url}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-group border border-line px-2 py-2 text-xs text-muted"
            />
          </div>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted">{t('payment.restoreTooLong')}</p>
      )}
      <p className="mt-2 text-xs text-muted">
        {t('payment.restoreNumber')}: {paymentId}
      </p>
    </div>
  );
}
