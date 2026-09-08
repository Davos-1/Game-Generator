import { createRng, type Rng } from '../random';
import {
  SHAPE_COUNT_BY_DIFFICULTY,
  type ShadowMatchOptions,
  type ShadowMatchPuzzle,
} from './types';

/**
 * Zufällige Umordnung von 0..count-1 ohne Fixpunkte: kein Wert bleibt an
 * seinem ursprünglichen Platz. Bei so kleinen Mengen (4 bis 6 Elemente)
 * ist erneutes Mischen bis zum Treffer die einfachste und schnellste Lösung.
 */
function derangement(count: number, rng: Rng): number[] {
  const identity = Array.from({ length: count }, (_, i) => i);
  if (count <= 1) return identity;
  let attempt: number[];
  do {
    attempt = rng.shuffle(identity);
  } while (attempt.some((value, index) => value === index));
  return attempt;
}

/**
 * Erzeugt ein Schattenrätsel: eine Reihenfolge für die Schatten, in der
 * keine Form direkt unter ihrem eigenen Original liegt. Deterministisch pro
 * Seed und Schwierigkeit.
 */
export function generateShadowMatch(options: ShadowMatchOptions): ShadowMatchPuzzle {
  const difficulty = options.difficulty ?? 'medium';
  const count = SHAPE_COUNT_BY_DIFFICULTY[difficulty];
  const rng = createRng(`${String(options.seed)}:shadow-match`);
  return {
    difficulty,
    count,
    shadowOrder: derangement(count, rng),
    seed: options.seed,
  };
}
