import type { CrosswordPuzzle, CrosswordWord } from '@raetselheft/engine';
import type { TextMeasurer } from '../measure';
import type { ContentBox } from '../page';
import { COLORS, type Element, type Mm, type Palette } from '../primitives';
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

/**
 * Zeichnet ein Kreuzworträtsel: das nummerierte Gitter oben, die Hinweise in
 * zwei Spalten (waagrecht/senkrecht) darunter. Gesperrte Felder werden
 * flächig gefüllt, wie im gedruckten Kreuzworträtsel üblich.
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
  const elements: Element[] = [];

  const clueSize = compact ? 6.5 : 9;
  const headingSize = compact ? 7.5 : 10;
  const lineHeight = clueSize * 1.55;
  const columnGap = compact ? 4 : 10;
  const columnWidth = (box.width - columnGap) / 2;

  const across = buildColumn(
    acrossLabel,
    puzzle.words.filter((w) => w.direction === 'across'),
    measurer,
    'body',
    clueSize,
    columnWidth,
  );
  const down = buildColumn(
    downLabel,
    puzzle.words.filter((w) => w.direction === 'down'),
    measurer,
    'body',
    clueSize,
    columnWidth,
  );
  const headingGap = compact ? 3 : 5;
  const listHeight =
    headingGap +
    headingSize * 0.8 +
    Math.max(across.lines.length, down.lines.length) * lineHeight +
    (compact ? 4 : 8);

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

  // Hinweisspalten unter dem Gitter.
  const listTop = gridBox.y + gridBox.height + headingGap;
  const columns = [
    { data: across, x: box.x },
    { data: down, x: box.x + columnWidth + columnGap },
  ];
  for (const { data, x } of columns) {
    elements.push({
      type: 'text',
      x,
      y: listTop + headingSize * 0.8,
      text: data.label,
      font: 'bodyBold',
      size: headingSize,
      color: palette.ink,
    });
    data.lines.forEach((line, index) => {
      elements.push({
        type: 'text',
        x,
        y: listTop + headingSize * 0.8 + headingGap + (index + 1) * lineHeight,
        text: line,
        font: 'body',
        size: clueSize,
        color: palette.ink,
      });
    });
  }

  return elements;
}
