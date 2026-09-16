import { artworkFor, type PrintMode } from '../artwork';
import { iconPath } from '../icons';
import type { TextMeasurer } from '../measure';
import { fitText, type ContentBox } from '../page';
import { A4, type Element } from '../primitives';
import { NEUTRAL_THEME, type Theme } from '../themes';

export interface CoverInfo {
  /** Grosse Zeile, z. B. «Piraten-Rätselheft». */
  title: string;
  /** Für wen, z. B. «Für Luca». */
  name?: string;
  /** Anlass, z. B. «Kindergeburtstag». */
  occasion?: string;
  /** Freier Datumstext, z. B. «12. Oktober 2026». */
  date?: string;
  /** Kurzer Gruss am Fuss, z. B. «Viel Spass beim Rätseln!». */
  greeting?: string;
}

/**
 * Deckblatt: grosses Theme-Motiv, Titel, Name, Anlass, Datum und Gruss.
 * Bewusst ohne flächigen Hintergrund, damit der Druck wenig Tinte braucht.
 */
export function coverElements(
  info: CoverInfo,
  box: ContentBox,
  measurer: TextMeasurer,
  theme: Theme = NEUTRAL_THEME,
  mode: PrintMode = 'sparsam',
): Element[] {
  const colors = theme.colors;
  const elements: Element[] = [];
  const centerX = box.x + box.width / 2;

  // Doppelter Zierrahmen; der Eckenradius kommt aus dem Theme, damit die
  // Designs sich schon am Rahmen unterscheiden (Hochzeit rechtwinklig).
  const radius = theme.frameRadiusMm;
  elements.push(
    {
      type: 'rect',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rx: radius,
      stroke: { color: colors.accent, width: 0.8 },
    },
    {
      type: 'rect',
      x: box.x + 2.5,
      y: box.y + 2.5,
      width: box.width - 5,
      height: box.height - 5,
      rx: Math.max(0, radius - 1),
      stroke: { color: colors.decor, width: 0.3 },
    },
  );

  // Motiv oben, bei neutralem Design ein schlichtes Ornament.
  const artwork = artworkFor(theme, 'cover', mode);
  // Die gelieferten Bilder haben 400 px Kantenlänge. Auf 85 mm wären das rund
  // 120 dpi, sichtbar zu wenig fürs Papier; 60 mm ergeben etwa 170 dpi. Sobald
  // höher aufgelöste Motive da sind, darf der Wert wieder steigen.
  const motifSize = artwork ? 60 : 52;
  const motifY = box.y + 46;
  if (artwork) {
    elements.push(
      {
        type: 'image',
        image: artwork,
        x: centerX - motifSize / 2,
        y: motifY - motifSize / 2,
        width: motifSize,
        height: motifSize,
      },
      // Die Bilder sind randlos durchgefärbt und haben keine Transparenz. Ein
      // Doppelrahmen fasst sie ein, damit der Hintergrund gewollt statt
      // versehentlich wirkt (siehe docs/design/UMSETZUNG.md).
      ...frameAround(centerX, motifY, motifSize, colors),
    );
  } else if (theme.id === NEUTRAL_THEME.id) {
    elements.push({
      type: 'circle',
      cx: centerX,
      cy: motifY,
      r: motifSize / 2.6,
      stroke: { color: colors.grid, width: 0.6 },
    });
  } else {
    elements.push({
      type: 'path',
      d: iconPath(theme.icons.cover, centerX, motifY, motifSize),
      fill: colors.accent,
    });
  }

  let y = motifY + motifSize / 2 + 24;

  const titleSize = 34;
  elements.push({
    type: 'text',
    x: centerX,
    y,
    text: fitText(measurer, info.title, 'display', titleSize, box.width - 16),
    font: 'display',
    size: titleSize,
    color: theme.id === NEUTRAL_THEME.id ? colors.ink : colors.accent,
    align: 'middle',
  });
  y += 12;

  if (info.name) {
    const size = 16;
    elements.push({
      type: 'text',
      x: centerX,
      y: y + 6,
      text: fitText(measurer, info.name, 'bodyBold', size, box.width - 16),
      font: 'bodyBold',
      size,
      color: colors.ink,
      align: 'middle',
    });
    y += 14;
  }

  // Feine Trennlinie zwischen Namen und Anlass.
  elements.push({
    type: 'line',
    x1: centerX - 11,
    y1: y + 4,
    x2: centerX + 11,
    y2: y + 4,
    stroke: { color: colors.decor, width: 0.4 },
  });
  y += 14;

  for (const line of [info.occasion, info.date].filter((value): value is string =>
    Boolean(value),
  )) {
    const size = 12;
    elements.push({
      type: 'text',
      x: centerX,
      y,
      text: fitText(measurer, line, 'body', size, box.width - 16),
      font: 'body',
      size,
      color: colors.muted,
      align: 'middle',
    });
    y += 8;
  }

  if (info.greeting) {
    const size = 12;
    elements.push({
      type: 'text',
      x: centerX,
      y: box.y + box.height - 22,
      text: fitText(measurer, info.greeting, 'body', size, box.width - 24),
      font: 'body',
      size,
      color: colors.ink,
      align: 'middle',
    });
  }

  // Kleine Deko unten in den Ecken.
  if (theme.id !== NEUTRAL_THEME.id) {
    const size = 13;
    for (const x of [box.x + 14, box.x + box.width - 14]) {
      elements.push({
        type: 'path',
        d: iconPath(theme.icons.corner, x, box.y + box.height - 14, size),
        fill: colors.decor,
        opacity: 0.85,
      });
    }
  }
  return elements;
}

/**
 * Fassung um ein Rasterbild: aussen eine kräftige Linie in `decor`, innen eine
 * feine helle. Beide liegen auf dem Bildrand, fressen also keinen Platz.
 */
export function frameAround(
  cx: number,
  cy: number,
  size: number,
  colors: Theme['colors'],
): Element[] {
  const half = size / 2;
  return [
    {
      type: 'rect',
      x: cx - half,
      y: cy - half,
      width: size,
      height: size,
      stroke: { color: colors.decor, width: 0.8 },
    },
    {
      type: 'rect',
      x: cx - half + 1,
      y: cy - half + 1,
      width: size - 2,
      height: size - 2,
      stroke: { color: '#ffffff', width: 0.5 },
      opacity: 0.8,
    },
  ];
}

/** Höhe des Deckblatt-Inhalts; Deckblätter nutzen die ganze Seite. */
export const COVER_BOX = (margin: number): ContentBox => ({
  x: margin,
  y: margin,
  width: A4.width - 2 * margin,
  height: A4.height - 2 * margin,
});
