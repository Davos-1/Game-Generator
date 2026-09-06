import type { TextMeasurer } from './measure';
import {
  A4,
  COLORS,
  MM_PER_PT,
  type Element,
  type Mm,
  type PageLayout,
  type TextElement,
} from './primitives';

/** Druckfreundlicher Seitenrahmen: 12 mm Rand (PLAN.md Abschnitt 4). */
export const MARGIN: Mm = 12;
export const HEADER_HEIGHT: Mm = 22;
export const FOOTER_HEIGHT: Mm = 8;

export interface ContentBox {
  x: Mm;
  y: Mm;
  width: Mm;
  height: Mm;
}

export interface PageFrameOptions {
  title: string;
  /** Zweite Zeile, z. B. «Für Luca» oder «Kindergeburtstag, 12. Oktober». */
  subtitle?: string;
  /** Kleine Zeile unten links, z. B. Website. */
  footerLeft?: string;
  /** Kleine Zeile unten rechts, z. B. Rätsel-Code für Nachdruck. */
  footerRight?: string;
  /** Diagonal wiederholter Text über dem Inhalt (Premium-Vorschau). */
  watermark?: string;
}

export interface PageFrame {
  page: PageLayout;
  /** Bereich unterhalb des Titels für das Rätsel. */
  content: ContentBox;
  /**
   * Wasserzeichen-Elemente. Sie gehören zuoberst und werden deshalb erst
   * angehängt, nachdem der Aufrufer das Rätsel gezeichnet hat.
   */
  watermark: Element[];
}

/** Erzeugt eine A4-Seite mit Titel, optionaler Unterzeile und Fusszeile. */
export function createPage(measurer: TextMeasurer, options: PageFrameOptions): PageFrame {
  const elements: Element[] = [];
  const innerWidth = A4.width - 2 * MARGIN;
  const titleSize = 22;
  const titleY = MARGIN + measurer.capHeight('display', titleSize);
  elements.push({
    type: 'text',
    x: MARGIN,
    y: titleY,
    text: fitText(measurer, options.title, 'display', titleSize, innerWidth),
    font: 'display',
    size: titleSize,
    color: COLORS.ink,
  });
  let contentTop = MARGIN + HEADER_HEIGHT;
  if (options.subtitle) {
    const subSize = 11;
    elements.push({
      type: 'text',
      x: MARGIN,
      y: titleY + 7,
      text: fitText(measurer, options.subtitle, 'body', subSize, innerWidth),
      font: 'body',
      size: subSize,
      color: COLORS.muted,
    });
    contentTop += 4;
  }
  // Feine Linie unter dem Kopf.
  elements.push({
    type: 'line',
    x1: MARGIN,
    y1: contentTop - 3,
    x2: A4.width - MARGIN,
    y2: contentTop - 3,
    stroke: { color: COLORS.light, width: 0.3 },
  });

  const footerY = A4.height - MARGIN;
  if (options.footerLeft) {
    elements.push(footerText(options.footerLeft, MARGIN, footerY, 'start'));
  }
  if (options.footerRight) {
    elements.push(footerText(options.footerRight, A4.width - MARGIN, footerY, 'end'));
  }

  const content: ContentBox = {
    x: MARGIN,
    y: contentTop,
    width: innerWidth,
    height: footerY - FOOTER_HEIGHT - contentTop,
  };

  const watermark = options.watermark
    ? watermarkElements(measurer, options.watermark, content)
    : [];

  return {
    page: { width: A4.width, height: A4.height, elements, label: options.title },
    content,
    watermark,
  };
}

function footerText(text: string, x: Mm, y: Mm, align: 'start' | 'end'): TextElement {
  return { type: 'text', x, y, text, font: 'body', size: 8, color: COLORS.muted, align };
}

/** Kürzt einen Text mit «…», bis er in `maxWidth` passt. */
export function fitText(
  measurer: TextMeasurer,
  text: string,
  font: TextElement['font'],
  size: number,
  maxWidth: Mm,
): string {
  if (measurer.width(text, font, size) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && measurer.width(`${cut}…`, font, size) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/**
 * Wasserzeichen: halbtransparenter, diagonal wiederholter Text über der
 * Inhaltsfläche. Wird als normale Textelemente in den Seiteninhalt gezeichnet,
 * also im PDF nicht als separate Ebene entfernbar (PLAN.md Abschnitt 4).
 */
export function watermarkElements(
  measurer: TextMeasurer,
  text: string,
  box: ContentBox,
): Element[] {
  const elements: Element[] = [];
  const size = 28;
  const width = measurer.width(text, 'display', size);
  const stepX = width + 25;
  const stepY = 45;
  const rows = Math.ceil(box.height / stepY) + 2;
  const cols = Math.ceil(box.width / stepX) + 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = box.x - stepX + c * stepX + (r % 2) * (stepX / 2);
      const y = box.y + r * stepY + 10;
      if (x > box.x + box.width || y > box.y + box.height + 10) continue;
      elements.push({
        type: 'text',
        x,
        y,
        text,
        font: 'display',
        size,
        color: COLORS.watermark,
        opacity: 0.28,
        rotate: -30,
      });
    }
  }
  return elements;
}

/** Schriftgrösse in mm (Hilfsfunktion für Zentrierung in Zellen). */
export const ptToMm = (pt: number): Mm => pt * MM_PER_PT;
