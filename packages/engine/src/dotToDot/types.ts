/**
 * Punkte-zu-Punkte: eine Reihe nummerierter Punkte, die in aufsteigender
 * Reihenfolge verbunden ein Bild ergeben. Die konkrete Zuordnung «welche
 * Form passt zu welchem Thema» entscheidet die Render-/Web-Schicht; die
 * Engine kennt nur die Formen selbst.
 */

/** Schwierigkeit steuert die Anzahl Punkte: wenige, grosse Punkte für
 *  jüngere Kinder, viele, dichte Punkte («Extrem-Punkte-zu-Punkte») für
 *  Geübte. */
export type DotToDotDifficulty = 'easy' | 'medium' | 'hard';

/** Zielanzahl Punkte pro Schwierigkeitsstufe. Sorgfältig so gewählt, dass
 *  bei jeder kuratierten Form (siehe shapes.ts) genug Abstand zwischen den
 *  Punkten bleibt, damit sich die Nummern beim Ausdrucken nicht berühren. */
export const POINT_COUNT_BY_DIFFICULTY: Readonly<Record<DotToDotDifficulty, number>> = {
  easy: 14,
  medium: 24,
  hard: 40,
};

export interface DotToDotOptions {
  /** Seed für reproduzierbare Ergebnisse. */
  seed: string | number;
  /** Bestimmt die Punktanzahl. Standard «medium». */
  difficulty?: DotToDotDifficulty;
  /** Feste Form statt zufälliger Auswahl; siehe SHAPE_IDS. */
  shapeId?: string;
}

export interface DotToDotPoint {
  /** Position auf einem quadratischen Feld 0–100. */
  x: number;
  y: number;
  /** Reihenfolge beim Verbinden, beginnend bei 1. */
  label: number;
}

export interface DotToDotPuzzle {
  shapeId: string;
  difficulty: DotToDotDifficulty;
  points: readonly DotToDotPoint[];
  /** Ob nach dem letzten Punkt eine Linie zurück zum ersten gehört. */
  closed: boolean;
  seed: string | number;
}
