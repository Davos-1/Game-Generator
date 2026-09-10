import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import { buildPages, buildPdf, buildPuzzle, pageToSvgString } from '../lib/render';
import type { PuzzleItem } from '@raetselheft/render';
import { puzzleString } from '../lib/payment';
import { usePurchase } from '../lib/purchase';
import CrosswordTopicPicker from './CrosswordTopicPicker';
import {
  configFromParams,
  configToParams,
  CROSSWORD_DIFFICULTIES,
  defaultConfig,
  defaultSymbols,
  fileName,
  loadConfig,
  newSeed,
  parseWords,
  saveConfig,
  SHAPE_CHOICES,
  THEME_CHOICES,
  themeWords,
  type PuzzleConfig,
  type PuzzleKind,
} from '../lib/puzzleConfig';

interface Props {
  kind: PuzzleKind;
  /** Vorausgewähltes Theme der Landing-Page; die URL hat Vorrang. */
  theme?: string;
}

/**
 * Seite je Rätseltyp, auf die Payrexx zurückführt. Landing-Pages sind nicht
 * dabei: der Worker lässt nur diese Adressen zu, und die Einstellungen
 * kommen ohnehin aus dem Speicher zurück.
 */
const RETURN_PATHS: Record<PuzzleKind, string> = {
  wordsearch: '/wortsuchraetsel',
  maze: '/labyrinth',
  sudoku: '/sudoku',
  'dot-to-dot': '/punkte-zu-punkte',
  'shadow-match': '/schattenraetsel',
  crossword: '/kreuzwortraetsel',
};

/** Parameter der Bezahlseite; sie gehören nicht zur Rätsel-Konfiguration. */
const PAYMENT_PARAMS = ['zahlung', 'status'];

/** Vorschau und Vorschau-PDF tragen ein Wasserzeichen, das gekaufte PDF nicht. */
const watermark = (unlocked: boolean): { watermark?: string } =>
  unlocked ? {} : { watermark: t('payment.watermark') };

type Status = 'loading' | 'ready' | 'error';

/**
 * Konfigurator mit Live-Vorschau. Änderungen an den Einstellungen wirken
 * sofort; «Neu würfeln» erzeugt eine neue Variante mit denselben Wörtern.
 * Die Konfiguration steht in der URL (teilbar) und im LocalStorage
 * (Wiederkommen ohne Konto).
 */
export default function PuzzleGenerator({ kind, theme }: Props): React.ReactElement {
  const [config, setConfig] = useState<PuzzleConfig>(() => defaultConfig(kind));
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>('');
  const [notes, setNotes] = useState<string[]>([]);
  const [svg, setSvg] = useState<{ puzzle: string; solution: string }>({
    puzzle: '',
    solution: '',
  });
  const [tab, setTab] = useState<'puzzle' | 'solution'>('puzzle');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const itemRef = useRef<PuzzleItem | undefined>(undefined);
  const purchase = usePurchase({
    product: 'single',
    returnPath: RETURN_PATHS[kind],
    config: puzzleString(config),
  });

  // Beim ersten Rendern: URL schlägt gespeicherte Konfiguration, sonst Standard.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    for (const name of PAYMENT_PARAMS) params.delete(name);
    if (params.size > 0) {
      setConfig(configFromParams(kind, params));
      return;
    }
    const stored = loadConfig(kind) ?? defaultConfig(kind);
    if (!theme || theme === stored.theme) {
      setConfig(stored);
      return;
    }
    // Landing-Page mit Thema: Design und passende Wörter vorwählen.
    const words = themeWords(theme);
    setConfig({
      ...stored,
      theme,
      ...(stored.kind === 'wordsearch' && words.length > 0 ? { words: words.join(', ') } : {}),
    });
  }, [kind, theme]);

  const update = useCallback((patch: Partial<PuzzleConfig>): void => {
    setConfig((current) => {
      const next = { ...current, ...patch } as PuzzleConfig;
      // Beim Themewechsel die Wortliste mitnehmen, solange sie unverändert
      // aus einem Theme stammt. Selbst eingegebene Wörter bleiben stehen.
      if (
        patch.theme !== undefined &&
        current.kind === 'wordsearch' &&
        next.kind === 'wordsearch' &&
        isUntouchedThemeList(current.words)
      ) {
        const words = themeWords(patch.theme);
        if (words.length > 0) next.words = words.join(', ');
      }
      return next;
    });
  }, []);

  // Rätsel erzeugen und Vorschau rendern, leicht verzögert wegen Texteingaben.
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const { item, notes: newNotes } = buildPuzzle(config);
          const pages = await buildPages(config, item, watermark(purchase.unlocked));
          const [puzzle, solution] = await Promise.all([
            pageToSvgString(pages.puzzle),
            pageToSvgString(pages.solution),
          ]);
          if (cancelled) return;
          itemRef.current = item;
          setSvg({ puzzle, solution });
          setNotes(newNotes);
          setError('');
          setStatus('ready');
        } catch (cause) {
          if (cancelled) return;
          itemRef.current = undefined;
          setError(cause instanceof Error ? cause.message : t('generator.common.error'));
          setStatus('error');
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [config, purchase.unlocked]);

  // Einstellungen in URL und LocalStorage spiegeln.
  useEffect(() => {
    const params = configToParams(config);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
    saveConfig(config);
    setCopied(false);
  }, [config]);

  const download = useCallback(async (): Promise<void> => {
    const item = itemRef.current;
    if (!item) return;
    setBusy(true);
    try {
      const pages = await buildPages(config, item, watermark(purchase.unlocked));
      const blob = await buildPdf(config, pages);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName(config);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('generator.common.error'));
    } finally {
      setBusy(false);
    }
  }, [config, purchase.unlocked]);

  const buy = useCallback(async (): Promise<void> => {
    const title = config.title.trim() || t(`generator.${config.kind}.defaultTitle`);
    await purchase.buy(`${t(`booklet.kinds.${config.kind}`)}: ${title}`);
  }, [config.kind, config.title, purchase]);

  const share = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, []);

  const preview = tab === 'puzzle' ? svg.puzzle : svg.solution;

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
      {/* Auf dem Handy steht die Vorschau oben: Änderungen sind sofort sichtbar. */}
      <form className="order-2 grid gap-5 lg:order-1" onSubmit={(event) => event.preventDefault()}>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t('generator.common.settings')}
        </h2>

        {config.kind === 'wordsearch' && <WordSearchFields config={config} update={update} />}
        {config.kind === 'maze' && (
          <Field label={t('generator.maze.size')}>
            <DifficultySelect
              value={config.difficulty}
              onChange={(difficulty) => update({ difficulty })}
            />
          </Field>
        )}
        {config.kind === 'sudoku' && <SudokuFields config={config} update={update} />}
        {config.kind === 'dot-to-dot' && <DotToDotFields config={config} update={update} />}
        {config.kind === 'shadow-match' && (
          <Field
            label={t('generator.common.difficulty')}
            hint={t('generator.shadow-match.difficultyHint')}
          >
            <DifficultySelect
              value={config.difficulty}
              onChange={(difficulty) => update({ difficulty })}
            />
          </Field>
        )}
        {config.kind === 'crossword' && <CrosswordFields config={config} update={update} />}

        <Field label={t('generator.common.theme')} hint={t('generator.common.themeHint')}>
          <div className="flex flex-wrap gap-2">
            {THEME_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={config.theme === choice.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm ${
                  config.theme === choice.id
                    ? 'border-accent-deep bg-paper text-ink'
                    : 'border-line-strong text-muted hover:bg-paper'
                }`}
                onClick={() => update({ theme: choice.id })}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: choice.color }}
                />
                {choice.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label={t('generator.common.title')}>
          <input
            className={inputClass}
            value={config.title}
            maxLength={60}
            placeholder={t('generator.common.titlePlaceholder')}
            onChange={(event) => update({ title: event.target.value })}
          />
        </Field>
        <Field label={t('generator.common.subtitle')}>
          <input
            className={inputClass}
            value={config.subtitle}
            maxLength={80}
            placeholder={t('generator.common.subtitlePlaceholder')}
            onChange={(event) => update({ subtitle: event.target.value })}
          />
        </Field>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={secondaryButton}
            onClick={() => update({ seed: newSeed() })}
          >
            {t('generator.common.shuffle')}
          </button>
          <button type="button" className={secondaryButton} onClick={() => void share()}>
            {copied ? t('generator.common.shared') : t('generator.common.share')}
          </button>
        </div>

        <div className="grid gap-2">
          {purchase.unlocked ? (
            <>
              <button
                type="button"
                className={primaryButton}
                disabled={status !== 'ready' || busy}
                onClick={() => void download()}
              >
                {busy ? t('generator.common.downloading') : t('payment.downloadClean')}
              </button>
              <p className="text-sm text-emerald-700">{t('payment.unlockedSingle')}</p>
            </>
          ) : (
            <>
              <button
                type="button"
                className={primaryButton}
                disabled={!purchase.enabled || status !== 'ready' || purchase.busy}
                onClick={() => void buy()}
              >
                {purchase.enabled
                  ? `${t('payment.buySingle')} – ${purchase.price}`
                  : t('payment.buySingle')}
              </button>
              <p className="text-sm text-muted">
                {purchase.enabled ? t('payment.ready') : t('payment.notReady')}
              </p>
              <button
                type="button"
                className={secondaryButton}
                disabled={status !== 'ready' || busy}
                onClick={() => void download()}
              >
                {busy ? t('generator.common.downloading') : t('payment.downloadPreview')}
              </button>
            </>
          )}
          {purchase.note && <p className="text-sm text-brand-700">{purchase.note}</p>}
        </div>

        {notes.length > 0 && (
          <div className="rounded-group border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">{t('generator.common.notes')}</p>
            <ul className="mt-1 list-inside list-disc">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </form>

      <div className="order-1 lg:order-2 lg:sticky lg:top-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="inline-flex rounded-group border border-line p-0.5" role="tablist">
            {(['puzzle', 'solution'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`rounded-sheet px-3 py-2 text-sm ${
                  tab === value ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-paper'
                }`}
                onClick={() => setTab(value)}
              >
                {value === 'puzzle'
                  ? t('generator.common.tabPuzzle')
                  : t('generator.common.tabSolution')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-group border border-line bg-white shadow-sm">
          {status === 'error' ? (
            <p className="p-8 text-center text-rose-700">{error || t('generator.common.error')}</p>
          ) : preview ? (
            <div
              className="[&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <div className="flex aspect-[210/297] items-center justify-center text-muted">
              {t('generator.common.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Stammt die Wortliste unverändert aus einem Theme? */
function isUntouchedThemeList(words: string): boolean {
  const current = parseWords(words).join('|');
  return THEME_CHOICES.some((choice) => {
    const list = themeWords(choice.id);
    return list.length > 0 && list.join('|') === current;
  });
}

const inputClass =
  'w-full rounded-group border border-line-strong px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25';
const primaryButton =
  'w-full rounded-group bg-accent px-4 py-2.5 font-semibold text-accent-ink hover:bg-accent-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-group border border-line-strong px-3 py-2 text-sm hover:bg-paper';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Stufenwahl; `levels` erlaubt zusätzliche Stufen, die nur ein Rätseltyp kennt. */
function DifficultySelect<T extends string>({
  value,
  onChange,
  levels = ['easy', 'medium', 'hard'] as unknown as readonly T[],
}: {
  value: T;
  onChange: (value: T) => void;
  levels?: readonly T[];
}) {
  return (
    <div className="inline-flex w-full rounded-group border border-line-strong p-0.5">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={value === level}
          className={`flex-1 rounded-sheet px-2 py-2 text-sm ${
            value === level ? 'bg-accent text-accent-ink' : 'text-muted hover:bg-paper'
          }`}
          onClick={() => onChange(level)}
        >
          {t(`generator.difficulty.${level}`)}
        </button>
      ))}
    </div>
  );
}

function WordSearchFields({
  config,
  update,
}: {
  config: Extract<PuzzleConfig, { kind: 'wordsearch' }>;
  update: (patch: Partial<PuzzleConfig>) => void;
}) {
  const count = useMemo(() => parseWords(config.words).length, [config.words]);
  return (
    <>
      <Field
        label={`${t('generator.wordsearch.words')} (${count})`}
        hint={t('generator.wordsearch.wordsHint')}
      >
        <textarea
          className={`${inputClass} min-h-32 font-mono`}
          value={config.words}
          placeholder={t('generator.wordsearch.wordsPlaceholder')}
          onChange={(event) => update({ words: event.target.value })}
        />
      </Field>
      <div className="-mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-muted">{t('generator.wordsearch.examples')}:</span>
        {THEME_CHOICES.filter((choice) => choice.id !== 'neutral').map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="rounded-full border border-line-strong px-3 py-1.5 text-xs hover:bg-paper"
            onClick={() => update({ words: themeWords(choice.id).join(', ') })}
          >
            {choice.name}
          </button>
        ))}
      </div>
      <Field label={`${t('generator.wordsearch.size')}: ${config.size} × ${config.size}`}>
        <input
          type="range"
          className="w-full accent-accent"
          min={8}
          max={20}
          value={config.size}
          onChange={(event) => update({ size: Number(event.target.value) })}
        />
      </Field>
      <Field label={t('generator.common.difficulty')}>
        <DifficultySelect
          value={config.difficulty}
          onChange={(difficulty) => update({ difficulty })}
        />
      </Field>
      <Field label={t('generator.wordsearch.umlauts')}>
        <select
          className={inputClass}
          value={config.umlauts}
          onChange={(event) => update({ umlauts: event.target.value } as Partial<PuzzleConfig>)}
        >
          <option value="keep">{t('generator.wordsearch.umlautsKeep')}</option>
          <option value="expand">{t('generator.wordsearch.umlautsExpand')}</option>
        </select>
      </Field>
    </>
  );
}

function SudokuFields({
  config,
  update,
}: {
  config: Extract<PuzzleConfig, { kind: 'sudoku' }>;
  update: (patch: Partial<PuzzleConfig>) => void;
}) {
  return (
    <>
      <Field label={t('generator.sudoku.size')}>
        <select
          className={inputClass}
          value={config.size}
          onChange={(event) => {
            // Beim Wechsel die passende Darstellung vorschlagen; das 9×9 kennt
            // ohnehin nur Zahlen.
            const size = Number(event.target.value) as (typeof config)['size'];
            update({ size, symbols: defaultSymbols(size) });
          }}
        >
          <option value={4}>{t('generator.sudoku.size4')}</option>
          <option value={6}>{t('generator.sudoku.size6')}</option>
          <option value={9}>{t('generator.sudoku.size9')}</option>
        </select>
      </Field>
      {config.size < 9 && (
        <Field label={t('generator.sudoku.display')} hint={t('generator.sudoku.kidsHint')}>
          <div className="inline-flex w-full rounded-group border border-line-strong p-0.5">
            {[
              { value: true, label: t('generator.sudoku.displaySymbols') },
              { value: false, label: t('generator.sudoku.displayNumbers') },
            ].map((option) => (
              <button
                key={String(option.value)}
                type="button"
                aria-pressed={config.symbols === option.value}
                className={`flex-1 rounded-sheet px-2 py-2 text-sm ${
                  config.symbols === option.value
                    ? 'bg-accent text-accent-ink'
                    : 'text-muted hover:bg-paper'
                }`}
                onClick={() => update({ symbols: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Field>
      )}
      <Field label={t('generator.common.difficulty')}>
        <DifficultySelect
          value={config.difficulty}
          onChange={(difficulty) => update({ difficulty })}
        />
      </Field>
    </>
  );
}

function DotToDotFields({
  config,
  update,
}: {
  config: Extract<PuzzleConfig, { kind: 'dot-to-dot' }>;
  update: (patch: Partial<PuzzleConfig>) => void;
}) {
  return (
    <>
      <Field label={t('generator.dot-to-dot.shape')}>
        <div className="flex flex-wrap gap-2">
          {SHAPE_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              aria-pressed={config.shapeId === choice.id}
              className={`rounded-group border px-3 py-2 text-sm ${
                config.shapeId === choice.id
                  ? 'border-accent-deep bg-paper text-ink'
                  : 'border-line-strong text-muted hover:bg-paper'
              }`}
              onClick={() => update({ shapeId: choice.id })}
            >
              {choice.name}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label={t('generator.common.difficulty')}
        hint={t('generator.dot-to-dot.difficultyHint')}
      >
        <DifficultySelect
          value={config.difficulty}
          onChange={(difficulty) => update({ difficulty })}
        />
      </Field>
    </>
  );
}

function CrosswordFields({
  config,
  update,
}: {
  config: Extract<PuzzleConfig, { kind: 'crossword' }>;
  update: (patch: Partial<PuzzleConfig>) => void;
}) {
  return (
    <>
      <Field
        label={t('generator.common.difficulty')}
        hint={t('generator.crossword.difficultyHint')}
      >
        <DifficultySelect
          value={config.difficulty}
          levels={CROSSWORD_DIFFICULTIES}
          onChange={(difficulty) => update({ difficulty })}
        />
      </Field>
      <CrosswordTopicPicker topics={config.topics} onChange={(topics) => update({ topics })} />
    </>
  );
}
