/**
 * Minimale Typdeklarationen für fontkit (2.x liefert keine mit).
 * Nur das, was die Textmessung braucht.
 */
declare module 'fontkit' {
  export interface Glyph {
    advanceWidth: number;
    id: number;
  }
  export interface GlyphRun {
    glyphs: Glyph[];
    advanceWidth: number;
  }
  export interface Font {
    unitsPerEm: number;
    ascent: number;
    descent: number;
    capHeight: number;
    xHeight: number;
    familyName: string;
    subfamilyName: string;
    /** Alle Codepoints, für die die Schrift eine Glyphe hat. */
    characterSet: number[];
    layout(text: string): GlyphRun;
    hasGlyphForCodePoint(codePoint: number): boolean;
  }
  export interface FontCollection {
    fonts: Font[];
  }
  export function create(buffer: Uint8Array): Font | FontCollection;
  export function openSync(path: string): Font | FontCollection;
}
