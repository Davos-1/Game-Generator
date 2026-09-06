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
): Element[] {
  const colors = theme.colors;
  const elements: Element[] = [];
  const centerX = box.x + box.width / 2;

  // Doppelter Zierrahmen in der Akzentfarbe.
  elements.push(
    {
      type: 'rect',
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rx: 4,
      stroke: { color: colors.accent, width: 0.8 },
    },
    {
      type: 'rect',
      x: box.x + 2.5,
      y: box.y + 2.5,
      width: box.width - 5,
      height: box.height - 5,
      rx: 3,
      stroke: { color: colors.decor, width: 0.3 },
    },
  );

  // Motiv oben, bei neutralem Design ein schlichtes Ornament.
  const motifSize = 52;
  const motifY = box.y + 46;
  if (theme.id === NEUTRAL_THEME.id) {
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
    x1: centerX - 18,
    y1: y + 4,
    x2: centerX + 18,
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
    const size = 8;
    for (const x of [box.x + 12, box.x + box.width - 12]) {
      elements.push({
        type: 'path',
        d: iconPath(theme.icons.corner, x, box.y + box.height - 12, size),
        fill: colors.decor,
        opacity: 0.7,
      });
    }
  }
  return elements;
}

/** Höhe des Deckblatt-Inhalts; Deckblätter nutzen die ganze Seite. */
export const COVER_BOX = (margin: number): ContentBox => ({
  x: margin,
  y: margin,
  width: A4.width - 2 * margin,
  height: A4.height - 2 * margin,
});
