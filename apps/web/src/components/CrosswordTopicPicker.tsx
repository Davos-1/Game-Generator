import { useEffect, useRef, useState } from 'react';
import { t } from '../i18n';
import {
  CROSSWORD_TOPIC_CATEGORIES,
  CROSSWORD_TOPICS,
  MAX_CROSSWORD_TOPICS,
} from '../lib/puzzleConfig';

interface Props {
  topics: string[];
  onChange: (topics: string[]) => void;
  /** Kleinere Schrift für die enge Spalte im Heft-Builder. */
  compact?: boolean;
}

/**
 * Auswahl der Wort-Themen: gewählte Themen als entfernbare Chips, dazu ein
 * Auswahlfeld, das nach Oberthemen gruppiert aufklappt. Eine flache Liste
 * wäre bei über zwanzig Themen unübersichtlich, ein Dropdown mit ebenso
 * vielen Einträgen ebenfalls.
 */
export default function CrosswordTopicPicker({
  topics,
  onChange,
  compact = false,
}: Props): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Klick daneben schliesst die Auswahl, wie man es von Auswahlfeldern kennt.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent): void => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const selected = topics
    .map((id) => CROSSWORD_TOPICS.find((topic) => topic.id === id))
    .filter((topic): topic is (typeof CROSSWORD_TOPICS)[number] => topic !== undefined);
  const canAddMore = topics.length < MAX_CROSSWORD_TOPICS;

  const add = (id: string): void => {
    if (topics.includes(id)) return;
    const next = [...topics, id];
    onChange(next);
    if (next.length >= MAX_CROSSWORD_TOPICS) setOpen(false);
  };

  const chipClass = compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const labelClass = compact ? 'text-[0.65rem]' : 'text-xs';

  // Design-Wortlisten kommen am Schluss als eigene Gruppe.
  const groups = [
    ...CROSSWORD_TOPIC_CATEGORIES.map((category) => ({
      key: category.id,
      name: category.name,
      items: CROSSWORD_TOPICS.filter(
        (topic) => topic.category === category.id && !topics.includes(topic.id),
      ),
    })),
    {
      key: 'design',
      name: t('generator.crossword.groupDesign'),
      items: CROSSWORD_TOPICS.filter(
        (topic) => topic.group === 'design' && !topics.includes(topic.id),
      ),
    },
  ].filter((group) => group.items.length > 0);

  // Kein <label>: das Feld enthält nur Schaltflächen, kein Eingabeelement.
  return (
    <div className="block">
      <span className="mb-1 block text-sm font-medium text-ink">
        {t('generator.crossword.topics')}
      </span>

      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selected.map((topic) => (
            <button
              key={topic.id}
              type="button"
              className={`flex items-center gap-1.5 rounded-full border border-accent-deep bg-paper text-ink ${chipClass}`}
              onClick={() => onChange(topics.filter((id) => id !== topic.id))}
            >
              {topic.name}
              <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}

      {canAddMore && (
        <div className="relative" ref={panelRef}>
          <button
            type="button"
            aria-expanded={open}
            className={`rounded-group border border-line-strong text-muted hover:bg-paper ${chipClass}`}
            onClick={() => setOpen((value) => !value)}
          >
            {t('generator.crossword.addTopic')}
          </button>

          {open && (
            <div className="absolute z-10 mt-1 max-h-80 w-full min-w-64 overflow-y-auto rounded-group border border-line-strong bg-surface p-3 shadow-lg">
              {groups.map((group) => (
                <div key={group.key} className="mb-3 last:mb-0">
                  <p
                    className={`mb-1.5 font-semibold uppercase tracking-wide text-muted ${labelClass}`}
                  >
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((topic) => (
                      <button
                        key={topic.id}
                        type="button"
                        className={`rounded-full border border-line-strong bg-paper text-ink hover:border-accent-deep ${chipClass}`}
                        onClick={() => add(topic.id)}
                      >
                        {topic.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <span className="mt-1 block text-xs text-muted">
        {topics.length === 0
          ? t('generator.crossword.topicsHintEmpty')
          : t('generator.crossword.topicsHint').replace('{max}', String(MAX_CROSSWORD_TOPICS))}
      </span>
    </div>
  );
}
