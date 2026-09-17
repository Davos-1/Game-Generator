/**
 * Eingabefeld für die Bestellbestätigung, gemeinsam für Einzelrätsel und Heft.
 *
 * Die Adresse wird nur an den Zahlungsdienst weitergereicht, der die
 * Bestätigung verschickt (UWG Art. 3 Abs. 1 lit. s Ziff. 4). Sie wird weder
 * gespeichert noch in den Teilen-Link geschrieben.
 */
import { t } from '../i18n';

const inputClass =
  'w-full rounded-group border border-line-strong px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25';

export function PurchaseEmail({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{t('payment.emailLabel')}</span>
      <input
        className={inputClass}
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        placeholder={t('payment.emailPlaceholder')}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-1 block text-xs text-muted">{t('payment.emailHint')}</span>
    </label>
  );
}

/** Hinweis auf AGB und Datenschutzerklärung direkt beim Kauf. */
export function PurchaseTerms() {
  return (
    <p className="text-xs text-muted">
      {t('payment.terms')}{' '}
      <a className="underline" href="/agb">
        {t('footer.terms')}
      </a>
      {' · '}
      <a className="underline" href="/datenschutz">
        {t('footer.privacy')}
      </a>
    </p>
  );
}
