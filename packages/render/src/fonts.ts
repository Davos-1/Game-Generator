import * as fontkit from 'fontkit';
import { MM_PER_PT, type FontKey, type Mm, type Pt } from './primitives';

/** Rohdaten der drei Schriftrollen (TrueType). Laden übernimmt Node (fs) oder der Browser (fetch). */
export type FontSet = Readonly<Record<FontKey, Uint8Array>>;

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

export interface TextMeasurer {
  /** Breite eines Textes in mm bei Schriftgrösse `size` pt. */
  width(text: string, font: FontKey, size: Pt): Mm;
  /** Höhe der Versalien (cap height) in mm, für vertikales Zentrieren. */
  capHeight(font: FontKey, size: Pt): Mm;
  ascent(font: FontKey, size: Pt): Mm;
  descent(font: FontKey, size: Pt): Mm;
}

type ParsedFont = fontkit.Font;

function parse(bytes: Uint8Array): ParsedFont {
  const font = fontkit.create(bytes);
  if ('fonts' in font) throw new Error('Font-Collections werden nicht unterstützt');
  return font;
}

/**
 * Textmessung über fontkit. Summiert die Vorschubbreiten der Glyphen ohne
 * Kerning, exakt wie pdf-lib beim Zeichnen; die SVG-Vorschau schaltet Kerning
 * ebenfalls aus, damit alle drei Wege dieselben Breiten ergeben.
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
