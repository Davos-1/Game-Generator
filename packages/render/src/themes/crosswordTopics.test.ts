import { generateCrossword } from '@raetselheft/engine';
import { describe, expect, it } from 'vitest';
import { CROSSWORD_TOPICS, crosswordTopicEntries, MAX_CROSSWORD_TOPICS } from './crosswordTopics';

const WORD_TOPICS = CROSSWORD_TOPICS.filter((topic) => topic.group === 'topic');

describe('Kreuzworträtsel-Wortthemen', () => {
  it('haben eindeutige Ids und Namen', () => {
    const ids = CROSSWORD_TOPICS.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = CROSSWORD_TOPICS.map((topic) => topic.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('bringen mindestens 20 taugliche Wörter je frei kombinierbarem Thema mit', () => {
    for (const topic of WORD_TOPICS) {
      const entries = crosswordTopicEntries([topic.id]);
      expect(entries.length, topic.id).toBeGreaterThanOrEqual(20);
    }
  });

  it('halten sich an Wortregeln und Schweizer Rechtschreibung (kein ß)', () => {
    for (const topic of WORD_TOPICS) {
      const entries = crosswordTopicEntries([topic.id]);
      const seen = new Set<string>();
      for (const entry of entries) {
        expect(entry.word, `${topic.id}: ${entry.word}`).toMatch(/^[A-Za-zÄÖÜäöü]{3,12}$/);
        expect(entry.word, `${topic.id}: ${entry.word}`).not.toMatch(/ß/);
        expect(entry.clue.trim().length, `${topic.id}: ${entry.word}`).toBeGreaterThan(0);
        expect(entry.clue, `${topic.id}: ${entry.word}`).not.toMatch(/ß/);
        const key = entry.word.toLowerCase();
        expect(seen.has(key), `${topic.id}: doppeltes Wort ${entry.word}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('verraten das gesuchte Wort nicht im eigenen Hinweistext', () => {
    for (const topic of WORD_TOPICS) {
      for (const entry of crosswordTopicEntries([topic.id])) {
        expect(
          entry.clue.toLowerCase(),
          `${topic.id}: ${entry.word} im Hinweis «${entry.clue}»`,
        ).not.toContain(entry.word.toLowerCase());
      }
    }
  });

  it('kombiniert mehrere Themen zu einer gemeinsamen, doppelfreien Liste', () => {
    const a = crosswordTopicEntries(['tiere']);
    const b = crosswordTopicEntries(['weltraum']);
    const combined = crosswordTopicEntries(['tiere', 'weltraum']);
    expect(combined.length).toBeLessThanOrEqual(a.length + b.length);
    expect(combined.length).toBeGreaterThanOrEqual(Math.max(a.length, b.length));
    const words = combined.map((entry) => entry.word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
  });

  it('fällt bei unbekannten oder fehlenden Ids auf die neutrale Liste zurück', () => {
    expect(crosswordTopicEntries(['gibt-es-nicht'])).toEqual(crosswordTopicEntries(['neutral']));
    expect(crosswordTopicEntries([])).toEqual(crosswordTopicEntries(['neutral']));
  });

  it('erzeugt aus jedem Thema allein ein gültiges Kreuzworträtsel', () => {
    for (const topic of WORD_TOPICS) {
      const puzzle = generateCrossword({
        seed: `topic-check:${topic.id}`,
        entries: crosswordTopicEntries([topic.id]),
        difficulty: 'hard',
      });
      expect(puzzle.words.length, topic.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('erzeugt aus einer Kombination mehrerer Themen ein grösseres Rätsel', () => {
    const puzzle = generateCrossword({
      seed: 'combo-check',
      entries: crosswordTopicEntries(['tiere', 'weltraum', 'dinosaurier']),
      difficulty: 'hard',
    });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(4);
  });

  it('begrenzt die sinnvoll kombinierbaren Themen', () => {
    expect(MAX_CROSSWORD_TOPICS).toBeGreaterThanOrEqual(2);
    expect(MAX_CROSSWORD_TOPICS).toBeLessThan(CROSSWORD_TOPICS.length);
  });
});
