import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import {
  bookletFileName,
  decodeBooklet,
  defaultBooklet,
  encodeBooklet,
  loadBooklet,
  MAX_ENTRIES,
  MAX_LINK_LENGTH,
  MIN_ENTRIES,
  newEntry,
  saveBooklet,
  type BookletConfig,
  type BookletEntry,
} from '../lib/bookletConfig';
import { bookletString } from '../lib/payment';
import { usePurchase } from '../lib/purchase';
import {
  defaultSymbols,
  newSeed,
  THEME_CHOICES,
  themeWords,
  type PuzzleKind,
} from '../lib/puzzleConfig';
import {
  buildBookletItems,
  buildBookletPages,
  buildBookletPdf,
  pageToSvgString,
} from '../lib/render';

const KINDS: PuzzleKind[] = ['wordsearch', 'maze', 'sudoku'];

/**
 * Heft-Builder: Deckblatt, Rätsel zusammenstellen und ordnen, Vorschau mit
 * Wasserzeichen. Die Konfiguration liegt im LocalStorage; ein Teilen-Link
 * enthält sie komprimiert, solange er nicht zu lang wird.
 */
export default function BookletBuilder(): React.ReactElement {
  const [config, setConfig] = useState<BookletConfig>(() => defaultBooklet());
  const [pages, setPages] = useState<string[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [linkState, setLinkState] = useState<'idle' | 'copied' | 'too-long'>('idle');
  const layoutRef = useRef<Awaited<ReturnType<typeof buildBookletPages>> | undefined>(undefined);
  const [dragId, setDragId] = useState<string | undefined>(undefined);
  const purchase = usePurchase({
    product: 'booklet',
    returnPath: '/raetselheft',
    config: bookletString(config),
  });
  const { unlocked } = purchase;

  // Beim Start: Link schlägt gespeichertes Heft, sonst Standard.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const param = params.get('h');
    void (async () => {
      const shared = param ? await decodeBooklet(param) : undefined;
      setConfig(shared ?? loadBooklet() ?? defaultBooklet());
    })();
  }, []);

  const update = useCallback((patch: Partial<BookletConfig>): void => {
    setConfig((current) => ({ ...current, ...patch }));
    setLinkState('idle');
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<BookletEntry>): void => {
    setConfig((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    }));
    setLinkState('idle');
  }, []);

  const move = useCallback((from: number, to: number): void => {
    setConfig((current) => {
      if (to < 0 || to >= current.entries.length) return current;
      const entries = [...current.entries];
      const [moved] = entries.splice(from, 1);
      if (moved) entries.splice(to, 0, moved);
      return { ...current, entries };
    });
  }, []);

  // Heft bauen und Vorschau rendern.
  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        const { entries, notes: buildNotes } = buildBookletItems(config);
        const layout = await buildBookletPages(config, entries, {
          watermark: t('payment.watermark'),
        });
        const svg = await Promise.all(layout.map((page) => pageToSvgString(page)));
        if (cancelled) return;
        layoutRef.current = layout;
        setPages(svg);
        setNotes(buildNotes);
        setPageIndex((index) => Math.min(index, Math.max(0, svg.length - 1)));
        setLoading(false);
      })();
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [config, unlocked]);

  useEffect(() => {
    saveBooklet(config);
  }, [config]);

  const share = useCallback(async (): Promise<void> => {
    const encoded = await encodeBooklet(config);
    const url = `${window.location.origin}${window.location.pathname}?h=${encoded}`;
    if (url.length > MAX_LINK_LENGTH) {
      setLinkState('too-long');
      return;
    }
    window.history.replaceState(null, '', url);
    try {
      await navigator.clipboard.writeText(url);
      setLinkState('copied');
    } catch {
      setLinkState('idle');
    }
  }, [config]);

  const download = useCallback(async (): Promise<void> => {
    const layout = layoutRef.current;
    if (!layout) return;
    setBusy(true);
    try {
      const blob = await buildBookletPdf(config, layout);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = bookletFileName(config);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } finally {
      setBusy(false);
    }
  }, [config]);

  const buy = useCallback(async (): Promise<void> => {
    const title = config.title.trim() || t('booklet.defaultTitle');
    await purchase.buy(`${t('booklet.defaultTitle')}: ${title}`);
  }, [config.title, purchase]);

  const canRemove = config.entries.length > MIN_ENTRIES;
  const canAdd = config.entries.length < MAX_ENTRIES;

  return (
    <div className="grid gap-8 lg:grid-cols-[26rem_1fr] lg:items-start">
      <form className="order-2 grid gap-6 lg:order-1" onSubmit={(event) => event.preventDefault()}>
        <section className="grid gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('booklet.cover')}
          </h2>
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
          <TextField
            label={t('booklet.coverTitle')}
            placeholder={t('booklet.coverTitlePlaceholder')}
            value={config.title}
            maxLength={50}
            onChange={(title) => update({ title })}
          />
          <TextField
            label={t('booklet.name')}
            placeholder={t('booklet.namePlaceholder')}
            value={config.name}
            maxLength={40}
            onChange={(name) => update({ name })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t('booklet.occasion')}
              placeholder={t('booklet.occasionPlaceholder')}
              value={config.occasion}
              maxLength={40}
              onChange={(occasion) => update({ occasion })}
            />
            <TextField
              label={t('booklet.date')}
              placeholder={t('booklet.datePlaceholder')}
              value={config.date}
              maxLength={30}
              onChange={(date) => update({ date })}
            />
          </div>
          <TextField
            label={t('booklet.greeting')}
            placeholder={t('booklet.greetingPlaceholder')}
            value={config.greeting}
            maxLength={70}
            onChange={(greeting) => update({ greeting })}
          />
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('booklet.puzzles')} ({config.entries.length})
          </h2>
          <ol className="grid gap-3">
            {config.entries.map((entry, index) => (
              <li
                key={entry.id}
                draggable
                onDragStart={() => setDragId(entry.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!dragId) return;
                  const from = config.entries.findIndex((candidate) => candidate.id === dragId);
                  if (from >= 0) move(from, index);
                  setDragId(undefined);
                }}
                className={`rounded-group border p-3 ${
                  dragId === entry.id ? 'border-accent-deep bg-paper' : 'border-line'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="cursor-grab text-muted" aria-hidden="true">
                    ⠿
                  </span>
                  <select
                    className={`${inputClass} flex-1`}
                    value={entry.kind}
                    aria-label={t('booklet.puzzles')}
                    onChange={(event) =>
                      updateEntry(entry.id, { kind: event.target.value as PuzzleKind })
                    }
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {t(`booklet.kinds.${kind}`)}
                      </option>
                    ))}
                  </select>
                  <IconButton label={t('booklet.moveUp')} onClick={() => move(index, index - 1)}>
                    ↑
                  </IconButton>
                  <IconButton label={t('booklet.moveDown')} onClick={() => move(index, index + 1)}>
                    ↓
                  </IconButton>
                  <IconButton
                    label={t('booklet.remove')}
                    disabled={!canRemove}
                    onClick={() =>
                      update({
                        entries: config.entries.filter((candidate) => candidate.id !== entry.id),
                      })
                    }
                  >
                    ×
                  </IconButton>
                </div>

                <div className="mt-3 grid gap-3">
                  <TextField
                    label={t('booklet.caption')}
                    placeholder={t('booklet.captionPlaceholder')}
                    value={entry.caption}
                    maxLength={40}
                    onChange={(caption) => updateEntry(entry.id, { caption })}
                  />
                  {entry.kind === 'wordsearch' && (
                    <Field label={t('generator.wordsearch.words')}>
                      <textarea
                        className={`${inputClass} min-h-20 font-mono`}
                        value={entry.words}
                        onChange={(event) => updateEntry(entry.id, { words: event.target.value })}
                      />
                      <button
                        type="button"
                        className="mt-1 inline-block py-1.5 text-xs text-brand-700 underline"
                        onClick={() =>
                          updateEntry(entry.id, { words: themeWords(config.theme, 12).join(', ') })
                        }
                      >
                        {t('generator.wordsearch.examples')}
                      </button>
                    </Field>
                  )}
                  {entry.kind === 'sudoku' && (
                    <>
                      <Field label={t('generator.sudoku.size')}>
                        <select
                          className={inputClass}
                          value={entry.sudokuSize}
                          onChange={(event) => {
                            const sudokuSize = Number(
                              event.target.value,
                            ) as BookletEntry['sudokuSize'];
                            updateEntry(entry.id, {
                              sudokuSize,
                              sudokuSymbols: defaultSymbols(sudokuSize),
                            });
                          }}
                        >
                          <option value={4}>{t('generator.sudoku.size4')}</option>
                          <option value={6}>{t('generator.sudoku.size6')}</option>
                          <option value={9}>{t('generator.sudoku.size9')}</option>
                        </select>
                      </Field>
                      {entry.sudokuSize < 9 && (
                        <Field label={t('generator.sudoku.display')}>
                          <div className="inline-flex rounded-group border border-line-strong p-0.5">
                            {[
                              { value: true, label: t('generator.sudoku.displaySymbols') },
                              { value: false, label: t('generator.sudoku.displayNumbers') },
                            ].map((option) => (
                              <button
                                key={String(option.value)}
                                type="button"
                                aria-pressed={entry.sudokuSymbols === option.value}
                                className={`rounded-sheet px-3 py-2 text-xs ${
                                  entry.sudokuSymbols === option.value
                                    ? 'bg-accent text-accent-ink'
                                    : 'text-muted hover:bg-paper'
                                }`}
                                onClick={() =>
                                  updateEntry(entry.id, { sudokuSymbols: option.value })
                                }
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </Field>
                      )}
                    </>
                  )}
                  <div className="flex items-end gap-2">
                    <Field label={t('generator.common.difficulty')}>
                      <div className="inline-flex rounded-group border border-line-strong p-0.5">
                        {(['easy', 'medium', 'hard'] as const).map((level) => (
                          <button
                            key={level}
                            type="button"
                            aria-pressed={entry.difficulty === level}
                            className={`rounded-sheet px-3 py-2 text-xs ${
                              entry.difficulty === level
                                ? 'bg-accent text-accent-ink'
                                : 'text-muted hover:bg-paper'
                            }`}
                            onClick={() => updateEntry(entry.id, { difficulty: level })}
                          >
                            {t(`generator.difficulty.${level}`)}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <button
                      type="button"
                      className="rounded-group border border-line-strong px-3 py-2 text-xs hover:bg-paper"
                      onClick={() => updateEntry(entry.id, { seed: newSeed() })}
                    >
                      {t('booklet.shuffleEntry')}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap gap-2">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={!canAdd}
                className="rounded-group border border-line-strong px-3 py-2 text-sm hover:bg-paper disabled:opacity-50"
                onClick={() =>
                  update({ entries: [...config.entries, newEntry(kind, config.theme)] })
                }
              >
                + {t(`booklet.kinds.${kind}`)}
              </button>
            ))}
          </div>
          {!canAdd && <p className="text-xs text-muted">{t('booklet.maxEntries')}</p>}
          {!canRemove && <p className="text-xs text-muted">{t('booklet.minEntries')}</p>}
        </section>

        <section className="grid gap-3">
          {unlocked ? (
            <>
              <button
                type="button"
                className={primaryButton}
                disabled={loading || busy}
                onClick={() => void download()}
              >
                {busy ? t('generator.common.downloading') : t('payment.downloadClean')}
              </button>
              <p className="text-sm text-emerald-700">{t('payment.unlockedBooklet')}</p>
            </>
          ) : (
            <>
              <button
                type="button"
                className={primaryButton}
                disabled={!purchase.enabled || purchase.busy}
                onClick={() => void buy()}
              >
                {purchase.enabled ? `${t('booklet.buy')} – ${purchase.price}` : t('booklet.buy')}
              </button>
              <p className="text-sm text-muted">
                {purchase.enabled ? t('payment.ready') : t('payment.notReady')}
              </p>
            </>
          )}
          {purchase.note && <p className="text-sm text-brand-700">{purchase.note}</p>}
          <div className="flex flex-wrap gap-2">
            {!unlocked && (
              <button
                type="button"
                className={secondaryButton}
                disabled={loading || busy}
                onClick={() => void download()}
              >
                {busy ? t('generator.common.downloading') : t('payment.downloadPreview')}
              </button>
            )}
            <button type="button" className={secondaryButton} onClick={() => void share()}>
              {linkState === 'copied' ? t('generator.common.shared') : t('generator.common.share')}
            </button>
          </div>
          {linkState === 'too-long' && (
            <p className="text-sm text-amber-700">{t('booklet.linkTooLong')}</p>
          )}
        </section>

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
        <div className="mb-3 flex items-center gap-3">
          <button
            type="button"
            className={secondaryButton}
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((index) => Math.max(0, index - 1))}
          >
            {t('booklet.previous')}
          </button>
          <span className="text-sm text-muted">
            {t('booklet.pageOf')
              .replace('{n}', String(pageIndex + 1))
              .replace('{total}', String(Math.max(1, pages.length)))}
          </span>
          <button
            type="button"
            className={secondaryButton}
            disabled={pageIndex >= pages.length - 1}
            onClick={() => setPageIndex((index) => Math.min(pages.length - 1, index + 1))}
          >
            {t('booklet.next')}
          </button>
        </div>
        <div className="overflow-hidden rounded-group border border-line bg-white shadow-sm">
          {pages[pageIndex] ? (
            <div
              className="[&>svg]:h-auto [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: pages[pageIndex] }}
            />
          ) : (
            <div className="flex aspect-[210/297] items-center justify-center text-muted">
              {t('booklet.building')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-group border border-line-strong px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25';
const primaryButton =
  'w-full rounded-group bg-accent px-4 py-2.5 font-semibold text-accent-ink hover:bg-accent-deep hover:text-white disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButton =
  'rounded-group border border-line-strong px-3 py-2 text-sm hover:bg-paper disabled:opacity-50';

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

function TextField({
  label,
  value,
  placeholder,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder ?? ''}
        maxLength={maxLength ?? 100}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function IconButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled ?? false}
      className="rounded-group border border-line-strong px-3 py-2 text-sm text-muted hover:bg-paper disabled:opacity-40"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
