/**
 * Layout-Primitive: die eine Quelle der Wahrheit für SVG-Vorschau und PDF.
 * Alle Koordinaten und Längen in Millimetern, Ursprung oben links, y nach unten.
 * Schriftgrössen in Punkt (pt), wie im Druck üblich.
 */

export type Mm = number;
export type Pt = number;

export const MM_PER_PT = 25.4 / 72;
export const PT_PER_MM = 72 / 25.4;

/** Schriftrollen; die konkreten Dateien liefert das FontSet. */
export type FontKey = 'display' | 'body' | 'bodyBold';

export interface Stroke {
  color: string;
  width: Mm;
  dash?: readonly Mm[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
}

export interface ShapeStyle {
  fill?: string;
  stroke?: Stroke;
  opacity?: number;
}

export interface RectElement extends ShapeStyle {
  type: 'rect';
  x: Mm;
  y: Mm;
  width: Mm;
  height: Mm;
  /** Eckenradius. */
  rx?: Mm;
}

export interface LineElement {
  type: 'line';
  x1: Mm;
  y1: Mm;
  x2: Mm;
  y2: Mm;
  stroke: Stroke;
  opacity?: number;
}

export interface PolylineElement {
  type: 'polyline';
  points: readonly (readonly [Mm, Mm])[];
  stroke: Stroke;
  opacity?: number;
}

export interface CircleElement extends ShapeStyle {
  type: 'circle';
  cx: Mm;
  cy: Mm;
  r: Mm;
}

/** SVG-Pfad in absoluten mm-Koordinaten; nur M, L, C, Z (pdf-lib-kompatibel). */
export interface PathElement extends ShapeStyle {
  type: 'path';
  d: string;
}

export interface TextElement {
  type: 'text';
  x: Mm;
  /** Grundlinie. */
  y: Mm;
  text: string;
  font: FontKey;
  size: Pt;
  color?: string;
  align?: 'start' | 'middle' | 'end';
  opacity?: number;
  /** Rotation in Grad im Uhrzeigersinn um (x, y). */
  rotate?: number;
}

export type Element =
  RectElement | LineElement | PolylineElement | CircleElement | PathElement | TextElement;

export interface PageLayout {
  width: Mm;
  height: Mm;
  elements: Element[];
  /** Für Dateinamen, Metadaten und Tests. */
  label?: string;
}

export const A4 = { width: 210, height: 297 } as const;

export const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/** Neutrale Standardfarben (Tintenfreundlich: kein flächiger Hintergrund). */
export const COLORS = {
  ink: '#1f2937',
  muted: '#6b7280',
  light: '#d1d5db',
  grid: '#9ca3af',
  accent: '#2f6df6',
  solution: '#e11d48',
  watermark: '#9ca3af',
} as const;
