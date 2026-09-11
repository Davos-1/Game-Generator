/**
 * Logik-Solver für Nonogramme.
 *
 * Er arbeitet ausschliesslich zeilen- und spaltenweise: Für eine einzelne
 * Zeile werden alle Anordnungen durchgespielt, die zu den Randzahlen und zum
 * bisherigen Wissen passen. Felder, die in jeder dieser Anordnungen gleich
 * aussehen, sind damit bewiesen. Das wiederholt sich über Zeilen und Spalten,
 * bis nichts Neues mehr folgt.
 *
 * Das ist bewusst genau die Technik, die ein Mensch mit Bleistift anwendet.
 * Wird ein Gitter damit vollständig aufgelöst, ist es ohne Raten lösbar und
 * seine Lösung zwingend eindeutig — beides Bedingungen, die der Generator an
 * jedes ausgelieferte Rätsel stellt.
 */

export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;

export type CellState = typeof UNKNOWN | typeof FILLED | typeof EMPTY;

/**
 * Obergrenze für die Anordnungen je Zeile. Bei den verwendeten Silhouetten
 * liegt die tatsächliche Zahl weit darunter; die Grenze schützt nur davor,
 * dass ein ungünstiges Bild den Generator ausbremst. Wird sie erreicht, gilt
 * die Zeile als nicht auswertbar und das Bild fällt durch.
 */
const MAX_ARRANGEMENTS = 200_000;

/**
 * Alle Felder einer Zeile, die in jeder zulässigen Anordnung denselben
 * Zustand haben. Gibt `undefined` zurück, wenn es gar keine zulässige
 * Anordnung gibt (Widerspruch) oder die Obergrenze erreicht wurde.
 */
export function deduceLine(
  clues: readonly number[],
  states: readonly CellState[],
): CellState[] | undefined {
  const n = states.length;
  const canFill = new Array<boolean>(n).fill(false);
  const canEmpty = new Array<boolean>(n).fill(false);
  const line = new Array<CellState>(n).fill(EMPTY);
  let arrangements = 0;
  let overflow = false;

  const record = (): void => {
    arrangements++;
    if (arrangements > MAX_ARRANGEMENTS) {
      overflow = true;
      return;
    }
    for (let i = 0; i < n; i++) {
      if (line[i] === FILLED) canFill[i] = true;
      else canEmpty[i] = true;
    }
  };

  /** Setzt den Block `clueIndex` an jede Stelle ab `start`, die passt. */
  const place = (clueIndex: number, start: number): void => {
    if (overflow) return;
    if (clueIndex === clues.length) {
      // Hinter dem letzten Block bleibt alles leer.
      for (let i = start; i < n; i++) {
        if (states[i] === FILLED) return;
      }
      for (let i = start; i < n; i++) line[i] = EMPTY;
      record();
      return;
    }

    const length = clues[clueIndex] as number;
    for (let from = start; from + length <= n; from++) {
      // Das Feld, das durch das Verschieben zur Lücke wird, darf nicht
      // gesichert ausgemalt sein — und weiter rechts erst recht nicht.
      if (from > start && states[from - 1] === FILLED) break;

      let fits = true;
      for (let i = from; i < from + length; i++) {
        if (states[i] === EMPTY) {
          fits = false;
          break;
        }
      }
      const after = from + length;
      if (fits && after < n && states[after] === FILLED) fits = false;
      if (!fits) continue;

      for (let i = start; i < from; i++) line[i] = EMPTY;
      for (let i = from; i < after; i++) line[i] = FILLED;
      if (after < n) line[after] = EMPTY;
      place(clueIndex + 1, Math.min(after + 1, n));
      if (overflow) return;
    }
  };

  place(0, 0);
  if (overflow || arrangements === 0) return undefined;

  const result = [...states];
  for (let i = 0; i < n; i++) {
    if (canFill[i] && !canEmpty[i]) result[i] = FILLED;
    else if (canEmpty[i] && !canFill[i]) result[i] = EMPTY;
  }
  return result;
}

export interface LineSolveResult {
  states: readonly CellState[];
  /** Ob jedes Feld bewiesen ist — nur dann ist das Rätsel ohne Raten lösbar. */
  complete: boolean;
}

/**
 * Löst ein Gitter so weit, wie reine Zeilen- und Spaltenlogik trägt.
 * `undefined` bedeutet: die Randzahlen widersprechen sich.
 */
export function solveByLines(
  rowClues: readonly (readonly number[])[],
  columnClues: readonly (readonly number[])[],
): LineSolveResult | undefined {
  const height = rowClues.length;
  const width = columnClues.length;
  const states = new Array<CellState>(width * height).fill(UNKNOWN);

  let changed = true;
  while (changed) {
    changed = false;

    for (let row = 0; row < height; row++) {
      const before: CellState[] = [];
      for (let col = 0; col < width; col++) before.push(states[row * width + col] as CellState);
      const after = deduceLine(rowClues[row] as readonly number[], before);
      if (!after) return undefined;
      for (let col = 0; col < width; col++) {
        if (after[col] !== before[col]) {
          states[row * width + col] = after[col] as CellState;
          changed = true;
        }
      }
    }

    for (let col = 0; col < width; col++) {
      const before: CellState[] = [];
      for (let row = 0; row < height; row++) before.push(states[row * width + col] as CellState);
      const after = deduceLine(columnClues[col] as readonly number[], before);
      if (!after) return undefined;
      for (let row = 0; row < height; row++) {
        if (after[row] !== before[row]) {
          states[row * width + col] = after[row] as CellState;
          changed = true;
        }
      }
    }
  }

  return { states, complete: states.every((state) => state !== UNKNOWN) };
}

/** Randzahlen einer Zeile oder Spalte: die Längen der ausgemalten Blöcke. */
export function runsOf(cells: readonly boolean[]): number[] {
  const runs: number[] = [];
  let run = 0;
  for (const filled of cells) {
    if (filled) {
      run++;
    } else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs;
}
