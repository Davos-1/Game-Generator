/**
 * Richtung, in der ein Wort im Gitter verläuft (Kompassrichtungen).
 * E = links nach rechts, S = oben nach unten, SE/NE = Diagonalen,
 * W/N/NW/SW = die jeweils rückwärts gelesenen Varianten.
 */
export type Direction = 'E' | 'S' | 'SE' | 'NE' | 'W' | 'N' | 'NW' | 'SW';

export const ALL_DIRECTIONS: readonly Direction[] = ['E', 'S', 'SE', 'NE', 'W', 'N', 'NW', 'SW'];

/** Schwierigkeitsstufe; bestimmt die erlaubten Richtungen (siehe DIRECTIONS_BY_DIFFICULTY). */
export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIRECTIONS_BY_DIFFICULTY: Readonly<Record<Difficulty, readonly Direction[]>> = {
  easy: ['E', 'S'],
  medium: ['E', 'S', 'SE', 'NE'],
  hard: ALL_DIRECTIONS,
};

/** Umgang mit Umlauten: «keep» lässt Ä/Ö/Ü im Gitter stehen, «expand» schreibt AE/OE/UE. */
export type UmlautMode = 'keep' | 'expand';

export interface Cell {
  row: number;
  col: number;
}

export interface WordSearchOptions {
  /** Wörter in beliebiger Schreibweise; werden normalisiert (Grossbuchstaben, ohne Sonderzeichen). */
  words: readonly string[];
  /** Seed für reproduzierbare Ergebnisse (z. B. für teilbare URLs). */
  seed: string | number;
  /** Gitterbreite (Spalten), 8–20. Standard 12. */
  width?: number;
  /** Gitterhöhe (Zeilen), 8–20. Standard = width. */
  height?: number;
  /** Bestimmt die Richtungen, sofern `directions` nicht explizit gesetzt ist. Standard «medium». */
  difficulty?: Difficulty;
  /** Explizite Richtungsauswahl; übersteuert `difficulty`. */
  directions?: readonly Direction[];
  /** Standard «keep». */
  umlauts?: UmlautMode;
  /** Zusätzliche oder eigene Blacklist; ersetzt die Standardliste, wenn gesetzt. */
  blacklist?: readonly string[];
  /** Maximale Anzahl Neustarts der Platzierung mit abgeleitetem Seed. Standard 20. */
  maxAttempts?: number;
}

export interface PlacedWord {
  /** Normalisiertes Wort, wie es im Gitter steht. */
  word: string;
  /** Ursprüngliche Eingabe des Nutzers (für die Wortliste unter dem Rätsel). */
  original: string;
  /** Startzelle des ersten Buchstabens. */
  start: Cell;
  direction: Direction;
  /** Alle belegten Zellen in Leserichtung des Worts. */
  cells: readonly Cell[];
}

export type RejectReason = 'empty' | 'too-long' | 'duplicate' | 'blacklisted';

export interface RejectedWord {
  original: string;
  reason: RejectReason;
}

export interface WordSearchPuzzle {
  width: number;
  height: number;
  /** grid[row][col], Grossbuchstaben. */
  grid: readonly (readonly string[])[];
  /** Erfolgreich platzierte Wörter inklusive Lösung. */
  placed: readonly PlacedWord[];
  /** Gültige Wörter, für die trotz aller Versuche kein Platz gefunden wurde. */
  unplaced: readonly string[];
  /** Ungültige Eingaben, die vor der Platzierung aussortiert wurden. */
  rejected: readonly RejectedWord[];
  /** Tatsächlich verwendete Richtungen. */
  directions: readonly Direction[];
  umlauts: UmlautMode;
  seed: string | number;
}
