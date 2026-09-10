import type { CrosswordPuzzle, CrosswordWord } from '@raetselheft/engine';
import type { TextMeasurer } from '../measure';
import type { ContentBox } from '../page';
import { COLORS, MM_PER_PT, type Element, type Mm, type Palette } from '../primitives';
import { fitBox } from './box';

export interface CrosswordDrawOptions {
  /** Lösung zeigen: Buchstaben statt leerer Felder. */
  solution?: boolean;
  compact?: boolean;
  palette?: Palette;
  /** Überschrift über den waagrechten Hinweisen. Standard «Waagrecht». */
  acrossLabel?: string;
  /** Überschrift über den senkrechten Hinweisen. Standard «Senkrecht». */
  downLabel?: string;
}

/** Zerlegt einen Text in Zeilen, die höchstens `maxWidth` breit sind. */
function wrapText(
  measurer: TextMeasurer,
  text: string,
  font: 'body' | 'bodyBold',
  size: number,
  maxWidth: Mm,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (current && measurer.width(attempt, font, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = attempt;
    }
  }
  if (current) lines.push(current);
  return lines;
}

interface ClueColumn {
  label: string;
  lines: string[];
}

function buildColumn(
  label: string,
  words: readonly CrosswordWord[],
  measurer: TextMeasurer,
  font: 'body' | 'bodyBold',
  size: Mm,
  maxWidth: Mm,
): ClueColumn {
  const sorted = [...words].sort((a, b) => a.number - b.number);
  const lines = sorted.flatMap((w) =>
    wrapText(measurer, `${w.number}. ${w.clue}`, font, size, maxWidth),
  );
  return { label, lines };
}

/** Anteil der Fläche, den die Hinweise höchstens beanspruchen sollen: das untere Viertel. */
const CLUE_AREA_RATIO = 0.25;

/** Schriftgrössen von gross nach klein; die erste, mit der alles ins Viertel passt, gewinnt. Nie unter 6 pt. */
const CLUE_SIZES = [9, 8.5, 8, 7.5, 7, 6.5, 6];
const COMPACT_CLUE_SIZES = [6.5, 6];

interface ClueLayout {
  /** Gesamthöhe des Hinweisblocks inklusive Überschrift und Abständen. */
  height: Mm;
  size: number;
  headingSize: number;
  headingCap: Mm;
  lineHeight: Mm;
  columnWidth: Mm;
  columnGap: Mm;
  headingGap: Mm;
  across: ClueColumn;
  down: ClueColumn;
}

/**
 * Sucht die grösste Schriftgrösse, mit der die Hinweise ins untere Viertel
 * passen. Passt selbst die kleinste nicht, wird der Block höher — lieber ein
 * etwas kleineres Gitter als abgeschnittene Hinweise.
 */
function layoutClues(
  puzzle: CrosswordPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  compact: boolean,
  acrossLabel: string,
  downLabel: string,
): ClueLayout {
  const columnGap = compact ? 4 : 10;
  const columnWidth = (box.width - columnGap) / 2;
  const headingGap = compact ? 2 : 4;
  const target = box.height * CLUE_AREA_RATIO;
  const acrossWords = puzzle.words.filter((w) => w.direction === 'across');
  const downWords = puzzle.words.filter((w) => w.direction === 'down');

  let layout: ClueLayout | undefined;
  for (const size of compact ? COMPACT_CLUE_SIZES : CLUE_SIZES) {
    const headingSize = size + 1;
    // Schriftgrössen sind Punkt, Abstände Millimeter: ohne Umrechnung wird der
    // Zeilenabstand rund dreimal zu gross und der Block frisst die halbe Seite.
    const headingCap = measurer.capHeight('bodyBold', headingSize);
    const lineHeight = size * MM_PER_PT * 1.35;
    const across = buildColumn(acrossLabel, acrossWords, measurer, 'body', size, columnWidth);
    const down = buildColumn(downLabel, downWords, measurer, 'body', size, columnWidth);
    const lines = Math.max(across.lines.length, down.lines.length);
    const height = headingGap + headingCap + headingGap + lines * lineHeight;
    layout = {
      height,
      size,
      headingSize,
      headingCap,
      lineHeight,
      columnWidth,
      columnGap,
      headingGap,
      across,
      down,
    };
    if (height <= target) break;
  }
  return layout as ClueLayout;
}

/**
 * Zeichnet ein Kreuzworträtsel: das nummerierte Gitter oben, die Hinweise im
 * unteren Viertel in zwei Spalten (waagrecht/senkrecht). Gesperrte Felder
 * werden flächig gefüllt, wie im gedruckten Kreuzworträtsel üblich.
 *
 * Auf einer vollen Lösungsseite bleibt die Hinweisfläche frei, statt sie zu
 * füllen: die Hinweise stehen schon auf der Rätselseite, und so liegt das
 * Lösungsgitter exakt gleich gross an derselben Stelle wie das Rätselgitter.
 * Nur in der Kompaktkachel des Hefts entfällt die Reserve, dort gibt es keine
 * zugehörige Rätselseite gleicher Grösse.
 */
export function crosswordElements(
  puzzle: CrosswordPuzzle,
  box: ContentBox,
  measurer: TextMeasurer,
  options: CrosswordDrawOptions = {},
): Element[] {
  const compact = options.compact ?? false;
  const palette = options.palette ?? COLORS;
  const acrossLabel = options.acrossLabel ?? 'Waagrecht';
  const downLabel = options.downLabel ?? 'Senkrecht';
  const drawClues = !options.solution;
  const reserveClues = drawClues || !compact;
  const elements: Element[] = [];

  const clues = reserveClues
    ? layoutClues(puzzle, box, measurer, compact, acrossLabel, downLabel)
    : undefined;
  const listHeight = clues?.height ?? 0;

  const gridArea: ContentBox = {
    x: box.x,
    y: box.y,
    width: box.width,
    height: Math.max(20, box.height - listHeight),
  };
  const gridBox = fitBox(gridArea, puzzle.width / puzzle.height);
  const cell = gridBox.width / puzzle.width;
  const lineWidth = compact ? 0.3 : 0.4;

  // Gesperrte Felder flächig, ausfüllbare Felder mit dünnem Rahmen.
  for (let r = 0; r < puzzle.height; r++) {
    for (let c = 0; c < puzzle.width; c++) {
      const x = gridBox.x + c * cell;
      const y = gridBox.y + r * cell;
      if (!puzzle.fillable[r]?.[c]) {
        elements.push({ type: 'rect', x, y, width: cell, height: cell, fill: palette.ink });
        continue;
      }
      elements.push({
        type: 'rect',
        x,
        y,
        width: cell,
        height: cell,
        stroke: { color: palette.grid, width: lineWidth },
      });
    }
  }

  // Nummern an den Startfeldern; ein Feld kann Start von across UND down
  // zugleich sein, dann teilen sie sich dieselbe Nummer (siehe Engine) und
  // die Nummer wird nur einmal gezeichnet.
  // Nie unter 6 pt (siehe print.test.ts), sonst wird die Nummer unleserlich.
  const numberSize = Math.max(6, cell * 0.28);
  const numberedStarts = new Map<string, number>();
  for (const word of puzzle.words) {
    numberedStarts.set(`${word.row},${word.col}`, word.number);
  }
  for (const [key, number] of numberedStarts) {
    const [row, col] = key.split(',').map(Number) as [number, number];
    elements.push({
      type: 'text',
      x: gridBox.x + col * cell + cell * 0.12,
      y: gridBox.y + row * cell + numberSize * 0.9,
      text: String(number),
      font: 'body',
      size: numberSize,
      color: palette.muted,
    });
  }

  if (options.solution) {
    // Nie unter 6 pt (siehe print.test.ts); bei dichten Lösungskacheln geht
    // das auf Kosten der Zellgrösse, ist aber immer noch lesbar.
    const letterSize = Math.max(6, cell * 1.9);
    const capHeight = measurer.capHeight('bodyBold', letterSize);
    for (let r = 0; r < puzzle.height; r++) {
      for (let c = 0; c < puzzle.width; c++) {
        const letter = puzzle.solution[r]?.[c];
        if (!letter) continue;
        elements.push({
          type: 'text',
          x: gridBox.x + (c + 0.5) * cell,
          y: gridBox.y + (r + 0.5) * cell + capHeight / 2,
          text: letter,
          font: 'bodyBold',
          size: letterSize,
          color: palette.ink,
          align: 'middle',
        });
      }
    }
  }

  // Hinweise stehen im unteren Viertel, unabhängig davon, wie hoch das Gitter
  // ausfällt. Auf der Lösungsseite bleibt dieselbe Fläche frei.
  if (clues && drawClues) {
    const bandTop = box.y + box.height - clues.height;
    const headingBaseline = bandTop + clues.headingGap + clues.headingCap;
    const columns = [
      { data: clues.across, x: box.x },
      { data: clues.down, x: box.x + clues.columnWidth + clues.columnGap },
    ];
    for (const { data, x } of columns) {
      elements.push({
        type: 'text',
        x,
        y: headingBaseline,
        text: data.label,
        font: 'bodyBold',
        size: clues.headingSize,
        color: palette.ink,
      });
      data.lines.forEach((line, index) => {
        elements.push({
          type: 'text',
          x,
          y: headingBaseline + clues.headingGap + (index + 1) * clues.lineHeight,
          text: line,
          font: 'body',
          size: clues.size,
          color: palette.ink,
        });
      });
    }
  }

  return elements;
}
