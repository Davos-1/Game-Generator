/**
 * Kreuzworträtsel: Wörter aus einer Wort-Hinweis-Liste werden so ins Gitter
 * gesetzt, dass sie sich an gemeinsamen Buchstaben kreuzen. Anders als bei
 * Sudoku oder Kakuro gibt es keine Mehrdeutigkeit zu prüfen — der Hinweis
 * benennt das Wort direkt, die Konstruktion muss nur ein gültiges,
 * zusammenhängendes Gitter ergeben.
 */

export type CrosswordDifficulty = 'easy' | 'medium' | 'hard' | 'extra-hard';

/** Zielanzahl platzierter Wörter pro Stufe; weniger als 4 ergibt kein Gitter. */
export const WORD_TARGET_BY_DIFFICULTY: Readonly<Record<CrosswordDifficulty, number>> = {
  easy: 6,
  medium: 9,
  hard: 12,
  'extra-hard': 16,
};

export const MIN_PLACED_WORDS = 4;

/** Kürzeste/längste zulässige Wortlänge (kürzer als 3 ist im Kreuzworträtsel unüblich). */
export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 12;

export interface CrosswordEntry {
  /** Beliebige Schreibweise; wird normalisiert (Grossbuchstaben, ohne Sonderzeichen). */
  word: string;
  /** Hinweistext, z. B. «Fährt über das Meer». */
  clue: string;
}

export interface CrosswordOptions {
  /** Wort-Hinweis-Paare, aus denen ausgewählt wird; mindestens MIN_PLACED_WORDS gültige Wörter nötig. */
  entries: readonly CrosswordEntry[];
  /** Seed für reproduzierbare Ergebnisse. */
  seed: string | number;
  /** Bestimmt die Zielanzahl Wörter. Standard «medium». */
  difficulty?: CrosswordDifficulty;
}

export type CrosswordDirection = 'across' | 'down';

export interface CrosswordWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: CrosswordDirection;
  /** Nummer am Startfeld, wie im gedruckten Kreuzworträtsel üblich. */
  number: number;
}

export interface CrosswordPuzzle {
  width: number;
  height: number;
  /** Buchstabe je Feld, leerer String auf gesperrten Feldern. */
  solution: readonly (readonly string[])[];
  /** true = Teil eines Wortes. */
  fillable: readonly (readonly boolean[])[];
  words: readonly CrosswordWord[];
  difficulty: CrosswordDifficulty;
  seed: string | number;
}
