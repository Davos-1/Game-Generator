import { MM_PER_PT, type FontKey, type Mm, type Pt } from './primitives';

export const FONT_FILES: Readonly<Record<FontKey, string>> = {
  display: 'Nunito-Bold.ttf',
  body: 'Inter-Regular.ttf',
  bodyBold: 'Inter-SemiBold.ttf',
};

/** CSS-Familiennamen für die SVG-Vorschau (@font-face mit denselben Dateien). */
export const FONT_FAMILIES: Readonly<Record<FontKey, string>> = {
  display: 'Nunito',
  body: 'Inter',
  bodyBold: 'Inter',
};

export const FONT_WEIGHTS: Readonly<Record<FontKey, number>> = {
  display: 700,
  body: 400,
  bodyBold: 600,
};

export interface FontMetrics {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  capHeight: number;
  /** Vorschubbreite für Zeichen ohne Glyphe. */
  fallbackWidth: number;
  /** Vorschubbreite je Unicode-Codepoint (als Dezimalzeichenkette). */
  widths: Record<string, number>;
}

export type MetricsTable = Record<FontKey, FontMetrics>;

export interface TextMeasurer {
  /** Breite eines Textes in mm bei Schriftgrösse `size` pt. */
  width(text: string, font: FontKey, size: Pt): Mm;
  /** Höhe der Versalien (cap height) in mm, für vertikales Zentrieren. */
  capHeight(font: FontKey, size: Pt): Mm;
  ascent(font: FontKey, size: Pt): Mm;
  descent(font: FontKey, size: Pt): Mm;
}

/**
 * Textmessung aus der vorbereiteten Metrik-Tabelle: summiert die
 * Vorschubbreiten der Zeichen, genau wie pdf-lib beim Zeichnen. Die Schriften
 * enthalten keine Layout-Tabellen, deshalb gibt es weder Kerning noch
 * Ligaturen; die SVG-Vorschau schaltet beides ebenfalls ab.
 */
export function createMetricsMeasurer(table: MetricsTable): TextMeasurer {
  const scale = (font: FontKey, size: Pt): number => (size / table[font].unitsPerEm) * MM_PER_PT;
  return {
    width(text, font, size) {
      const metrics = table[font];
      let units = 0;
      for (const char of text) {
        const code = char.codePointAt(0);
        units +=
          (code === undefined ? undefined : metrics.widths[String(code)]) ?? metrics.fallbackWidth;
      }
      return units * scale(font, size);
    },
    capHeight: (font, size) => table[font].capHeight * scale(font, size),
    ascent: (font, size) => table[font].ascent * scale(font, size),
    descent: (font, size) => Math.abs(table[font].descent) * scale(font, size),
  };
}
