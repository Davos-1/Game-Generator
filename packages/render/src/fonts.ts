import * as fontkit from 'fontkit';
import {
  createMetricsMeasurer,
  FONT_FAMILIES,
  FONT_FILES,
  FONT_WEIGHTS,
  type TextMeasurer,
} from './measure';
import metricsTable from './metrics.json';
import { MM_PER_PT, type FontKey, type Pt } from './primitives';

/** Rohdaten der drei Schriftrollen (TrueType). Laden übernimmt Node (fs) oder der Browser (fetch). */
export type FontSet = Readonly<Record<FontKey, Uint8Array>>;

export { FONT_FAMILIES, FONT_FILES, FONT_WEIGHTS };
export type { TextMeasurer };

/**
 * Messer aus der vorbereiteten Metrik-Tabelle. Für den Browser gedacht: kein
 * fontkit, keine Schriftdateien im Speicher.
 */
export const createTableMeasurer = (): TextMeasurer => createMetricsMeasurer(metricsTable);

type ParsedFont = fontkit.Font;

function parse(bytes: Uint8Array): ParsedFont {
  const font = fontkit.create(bytes);
  if ('fonts' in font) throw new Error('Font-Collections werden nicht unterstützt');
  return font;
}

/**
 * Textmessung direkt aus den Schriftdateien über fontkit. Wird in Node
 * (Skripte, Tests) verwendet; im Browser übernimmt createTableMeasurer().
 */
export function createMeasurer(fonts: FontSet): TextMeasurer {
  const parsed: Record<FontKey, ParsedFont> = {
    display: parse(fonts.display),
    body: parse(fonts.body),
    bodyBold: parse(fonts.bodyBold),
  };
  const scale = (font: ParsedFont, size: Pt): number => (size / font.unitsPerEm) * MM_PER_PT;

  return {
    width(text, key, size) {
      const font = parsed[key];
      let units = 0;
      for (const glyph of font.layout(text).glyphs) units += glyph.advanceWidth;
      return units * scale(font, size);
    },
    capHeight(key, size) {
      const font = parsed[key];
      return font.capHeight * scale(font, size);
    },
    ascent(key, size) {
      const font = parsed[key];
      return font.ascent * scale(font, size);
    },
    descent(key, size) {
      const font = parsed[key];
      return Math.abs(font.descent) * scale(font, size);
    },
  };
}
