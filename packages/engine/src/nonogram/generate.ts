import { createRng } from '../random';
import { PICTURE_IDS, PICTURE_VARIANTS, pictureById, rasterize } from './pictures';
import { runsOf, solveByLines } from './solver';
import { NONOGRAM_SIZE_BY_DIFFICULTY, type NonogramOptions, type NonogramPuzzle } from './types';

/**
 * Anteil ausgemalter Felder, den ein brauchbares Bild haben muss. Zu wenig
 * ergibt ein leeres Blatt ohne erkennbares Motiv, zu viel einen schwarzen
 * Klotz — in beiden Fällen ist das Rätsel zwar lösbar, aber langweilig.
 */
const MIN_FILL = 0.22;
const MAX_FILL = 0.72;

const rowsOf = (cells: readonly boolean[], size: number): boolean[][] =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => cells[row * size + col] as boolean),
  );

const columnsOf = (cells: readonly boolean[], size: number): boolean[][] =>
  Array.from({ length: size }, (_, col) =>
    Array.from({ length: size }, (_, row) => cells[row * size + col] as boolean),
  );

/**
 * Erzeugt ein Nonogramm mit eindeutiger, ohne Raten erreichbarer Lösung.
 *
 * Vorgehen: Ein Bild wird (sofern nicht fest vorgegeben) per Seed gewählt und
 * in verschiedenen Lagen ins Gitter gerastert. Die erste Lage, die genug
 * Motiv zeigt und sich vom Logik-Solver vollständig auflösen lässt, wird
 * genommen. Deterministisch pro Seed und Optionen.
 */
/**
 * Wie viel vom Gitter das Motiv überhaupt bespielt: Anteil der Zeilen und
 * Spalten, in denen mindestens ein Feld ausgemalt ist. Ein Bild, das nur in
 * der Mitte kauert, lässt Randzeilen mit lauter Nullen zurück — lösbar, aber
 * als Blatt enttäuschend.
 */
function coverage(
  rows: readonly (readonly boolean[])[],
  columns: readonly (readonly boolean[])[],
): number {
  const used = (lines: readonly (readonly boolean[])[]): number =>
    lines.filter((line) => line.some(Boolean)).length;
  return (used(rows) / rows.length) * (used(columns) / columns.length);
}

/**
 * Erzeugt ein Nonogramm mit eindeutiger, ohne Raten erreichbarer Lösung.
 *
 * Vorgehen: Ein Bild wird (sofern nicht fest vorgegeben) per Seed gewählt und
 * in verschiedenen Lagen ins Gitter gerastert. Unter den Lagen, die genug
 * Motiv zeigen, kommen die gitterfüllendsten in die engere Wahl; daraus
 * nimmt der Seed die erste, die sich vom Logik-Solver vollständig auflösen
 * lässt. Deterministisch pro Seed und Optionen.
 */
export function generateNonogram(options: NonogramOptions): NonogramPuzzle {
  const difficulty = options.difficulty ?? 'medium';
  const size = NONOGRAM_SIZE_BY_DIFFICULTY[difficulty];
  const rng = createRng(`${String(options.seed)}:nonogram`);
  const pictureId = options.pictureId ?? rng.pick(PICTURE_IDS);
  const picture = pictureById(pictureId);

  const candidates = PICTURE_VARIANTS.map((variant) => {
    const cells = rasterize(picture, size, variant);
    const rows = rowsOf(cells, size);
    const columns = columnsOf(cells, size);
    return {
      cells,
      rows,
      columns,
      ratio: cells.filter(Boolean).length / cells.length,
      coverage: coverage(rows, columns),
    };
  })
    .filter((candidate) => candidate.ratio >= MIN_FILL && candidate.ratio <= MAX_FILL)
    .sort((a, b) => b.coverage - a.coverage);

  // Nur die dichtesten Lagen kommen in Frage; darunter entscheidet der Seed,
  // damit zwei Rätsel derselben Form nicht identisch aussehen.
  const best = candidates[0]?.coverage ?? 0;
  const shortlist = candidates.filter((candidate) => candidate.coverage >= best - 0.05);

  for (const candidate of rng.shuffle(shortlist)) {
    const rowClues = candidate.rows.map(runsOf);
    const columnClues = candidate.columns.map(runsOf);

    // Nur Bilder, die reine Zeilen- und Spaltenlogik vollständig auflöst:
    // damit ist die Lösung eindeutig und nie geraten.
    const solved = solveByLines(rowClues, columnClues);
    if (!solved || !solved.complete) continue;

    return {
      pictureId,
      difficulty,
      width: size,
      height: size,
      solution: candidate.cells,
      rowClues,
      columnClues,
      seed: options.seed,
    };
  }

  throw new Error(`Konnte kein eindeutig lösbares Nonogramm erzeugen: ${pictureId}/${difficulty}`);
}
