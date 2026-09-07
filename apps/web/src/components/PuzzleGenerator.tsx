import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../i18n';
import {
  buildPages,
  buildPdf,
  buildPuzzle,
  pageToSvgString,
  type RenderedPages,
} from '../lib/render';
import {
  configFromParams,
  configToParams,
  defaultConfig,
  fileName,
  loadConfig,
  newSeed,
  parseWords,
  saveConfig,
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
  const pagesRef = useRef<RenderedPages | undefined>(undefined);

  // Beim ersten Rendern: URL schlägt gespeicherte Konfiguration, sonst Standard.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
          const pages = await buildPages(config, item);
          const [puzzle, solution] = await Promise.all([
            pageToSvgString(pages.puzzle),
            pageToSvgString(pages.solution),
          ]);
          if (cancelled) return;
          pagesRef.current = pages;
          setSvg({ puzzle, solution });
          setNotes(newNotes);
          setError('');
          setStatus('ready');
        } catch (cause) {
          if (cancelled) return;
          pagesRef.current = undefined;
          setError(cause instanceof Error ? cause.message : t('generator.common.error'));
          setStatus('error');
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [config]);

  // Einstellungen in URL und LocalStorage spiegeln.
  useEffect(() => {
    const params = configToParams(config);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', url);
    saveConfig(config);
    setCopied(false);
  }, [config]);

  const download = useCallback(async (): Promise<void> => {
    const pages = pagesRef.current;
    if (!pages) return;
    setBusy(true);
    try {
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
  }, [config]);

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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
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

        <Field label={t('generator.common.theme')} hint={t('generator.common.themeHint')}>
          <div className="flex flex-wrap gap-2">
            {THEME_CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                aria-pressed={config.theme === choice.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
                  config.theme === choice.id
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
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

        <div>
          <button
            type="button"
            className={primaryButton}
            disabled={status !== 'ready' || busy}
            onClick={() => void download()}
          >
            {busy ? t('generator.common.downloading') : t('generator.common.download')}
          </button>
          <p className="mt-2 text-sm text-slate-500">{t('generator.common.free')}</p>
        </div>

        {notes.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
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
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="tablist">
            {(['puzzle', 'solution'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`rounded-md px-3 py-1.5 text-sm ${
                  tab === value ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50'
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

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {status === 'error' ? (
            <p className="p-8 text-center text-rose-700">{error || t('generator.common.error')}</p>
          ) : preview ? (
            <div
              className="[&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: preview }}
            />
          ) : (
            <div className="flex aspect-[210/297] items-center justify-center text-slate-400">
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
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
const primaryButton =
  'w-full rounded-lg bg-brand-500 px-4 py-2.5 font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton = 'rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50';

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
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

function DifficultySelect({
  value,
  onChange,
}: {
  value: 'easy' | 'medium' | 'hard';
  onChange: (value: 'easy' | 'medium' | 'hard') => void;
}) {
  return (
    <div className="inline-flex w-full rounded-lg border border-slate-300 p-0.5">
      {(['easy', 'medium', 'hard'] as const).map((level) => (
        <button
          key={level}
          type="button"
          aria-pressed={value === level}
          className={`flex-1 rounded-md px-2 py-1.5 text-sm ${
            value === level ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-50'
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
        <span className="text-xs text-slate-500">{t('generator.wordsearch.examples')}:</span>
        {THEME_CHOICES.filter((choice) => choice.id !== 'neutral').map((choice) => (
          <button
            key={choice.id}
            type="button"
            className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs hover:bg-slate-50"
            onClick={() => update({ words: themeWords(choice.id).join(', ') })}
          >
            {choice.name}
          </button>
        ))}
      </div>
      <Field label={`${t('generator.wordsearch.size')}: ${config.size} × ${config.size}`}>
        <input
          type="range"
          className="w-full accent-brand-500"
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
      <Field
        label={t('generator.sudoku.size')}
        hint={config.size < 9 ? t('generator.sudoku.kidsHint') : ''}
      >
        <select
          className={inputClass}
          value={config.size}
          onChange={(event) => update({ size: Number(event.target.value) })}
        >
          <option value={4}>{t('generator.sudoku.size4')}</option>
          <option value={6}>{t('generator.sudoku.size6')}</option>
          <option value={9}>{t('generator.sudoku.size9')}</option>
        </select>
      </Field>
      <Field label={t('generator.common.difficulty')}>
        <DifficultySelect
          value={config.difficulty}
          onChange={(difficulty) => update({ difficulty })}
        />
      </Field>
    </>
  );
}
