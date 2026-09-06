import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { FontSet } from './fonts';
import {
  PT_PER_MM,
  type Element,
  type FontKey,
  type PageLayout,
  type RectElement,
  type Stroke,
} from './primitives';

export interface PdfMetadata {
  title?: string;
  subject?: string;
  keywords?: readonly string[];
  creator?: string;
}

/** Nur Vorschubbreiten verwenden, damit SVG-Vorschau und PDF identisch messen. */
const FONT_FEATURES = { liga: false, clig: false, calt: false, kern: false };

/**
 * Die Schriften werden vollständig eingebettet, nicht von pdf-lib untermengt:
 * dessen Untermengen-Code liefert bei diesen Schriften fehlende Glyphen
 * (ganze Buchstaben verschwinden im PDF). Die Dateien in `fonts/` sind dafür
 * bereits beim Vorbereiten auf Latein und Deutsch reduziert (siehe
 * fonts/README.md) und zusammen nur rund 76 KB gross.
 */
const EMBED_OPTIONS = { subset: false, features: FONT_FEATURES } as const;

type Rgb = ReturnType<typeof rgb>;

function toRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const num = Number.parseInt(full, 16);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

/** Runde Ecken als Pfad, weil pdf-lib bei Rechtecken keinen Radius kennt. */
function roundedRectPath(el: RectElement): string {
  const r = Math.min(el.rx ?? 0, el.width / 2, el.height / 2);
  const { x, y, width: w, height: h } = el;
  const k = r * 0.5523;
  return [
    `M ${x + r} ${y}`,
    `L ${x + w - r} ${y}`,
    `C ${x + w - r + k} ${y} ${x + w} ${y + r - k} ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `C ${x + w} ${y + h - r + k} ${x + w - r + k} ${y + h} ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `C ${x + r - k} ${y + h} ${x} ${y + h - r + k} ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `C ${x} ${y + r - k} ${x + r - k} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

interface DrawContext {
  page: PDFPage;
  /** Seitenhöhe in mm, für die Umrechnung von y (oben) nach PDF (unten). */
  height: number;
  fonts: Record<FontKey, PDFFont>;
}

const strokeOptions = (
  stroke: Stroke,
): { borderColor: Rgb; borderWidth: number; borderDashArray?: number[] } => ({
  borderColor: toRgb(stroke.color),
  borderWidth: stroke.width * PT_PER_MM,
  ...(stroke.dash ? { borderDashArray: stroke.dash.map((d) => d * PT_PER_MM) } : {}),
});

function drawPath(
  ctx: DrawContext,
  d: string,
  style: { fill?: string; stroke?: Stroke; opacity?: number },
): void {
  ctx.page.drawSvgPath(d, {
    x: 0,
    y: ctx.height * PT_PER_MM,
    scale: PT_PER_MM,
    ...(style.fill ? { color: toRgb(style.fill) } : {}),
    ...(style.stroke ? strokeOptions(style.stroke) : { borderWidth: 0 }),
    ...(style.opacity !== undefined
      ? { opacity: style.opacity, borderOpacity: style.opacity }
      : {}),
  });
}

function drawElement(ctx: DrawContext, el: Element): void {
  switch (el.type) {
    case 'rect':
      if (el.rx) {
        drawPath(ctx, roundedRectPath(el), el);
        return;
      }
      ctx.page.drawRectangle({
        x: el.x * PT_PER_MM,
        y: (ctx.height - el.y - el.height) * PT_PER_MM,
        width: el.width * PT_PER_MM,
        height: el.height * PT_PER_MM,
        ...(el.fill ? { color: toRgb(el.fill) } : { opacity: 0 }),
        ...(el.stroke ? strokeOptions(el.stroke) : { borderWidth: 0 }),
        ...(el.opacity !== undefined ? { opacity: el.opacity, borderOpacity: el.opacity } : {}),
      });
      return;
    case 'line':
      ctx.page.drawLine({
        start: { x: el.x1 * PT_PER_MM, y: (ctx.height - el.y1) * PT_PER_MM },
        end: { x: el.x2 * PT_PER_MM, y: (ctx.height - el.y2) * PT_PER_MM },
        thickness: el.stroke.width * PT_PER_MM,
        color: toRgb(el.stroke.color),
        ...(el.stroke.dash ? { dashArray: el.stroke.dash.map((d) => d * PT_PER_MM) } : {}),
        ...(el.stroke.lineCap ? { lineCap: lineCapOf(el.stroke.lineCap) } : {}),
        ...(el.opacity !== undefined ? { opacity: el.opacity } : {}),
      });
      return;
    case 'polyline': {
      const [first, ...rest] = el.points;
      if (!first) return;
      const d = `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')}`;
      drawPath(ctx, d, {
        stroke: el.stroke,
        ...(el.opacity !== undefined ? { opacity: el.opacity } : {}),
      });
      return;
    }
    case 'circle':
      ctx.page.drawCircle({
        x: el.cx * PT_PER_MM,
        y: (ctx.height - el.cy) * PT_PER_MM,
        size: el.r * PT_PER_MM,
        ...(el.fill ? { color: toRgb(el.fill) } : {}),
        ...(el.stroke ? strokeOptions(el.stroke) : { borderWidth: 0 }),
        ...(el.opacity !== undefined ? { opacity: el.opacity, borderOpacity: el.opacity } : {}),
      });
      return;
    case 'path':
      drawPath(ctx, el.d, el);
      return;
    case 'text': {
      const font = ctx.fonts[el.font];
      const width = font.widthOfTextAtSize(el.text, el.size);
      const shift = el.align === 'middle' ? width / 2 : el.align === 'end' ? width : 0;
      ctx.page.drawText(el.text, {
        x: el.x * PT_PER_MM - shift,
        y: (ctx.height - el.y) * PT_PER_MM,
        font,
        size: el.size,
        color: toRgb(el.color ?? '#1f2937'),
        ...(el.rotate
          ? {
              rotate: degrees(-el.rotate),
              // pdf-lib dreht um den Textursprung; der Versatz für die
              // Ausrichtung muss deshalb mitgedreht werden.
              x: el.x * PT_PER_MM - shift * Math.cos((el.rotate * Math.PI) / 180),
              y: (ctx.height - el.y) * PT_PER_MM + shift * Math.sin((el.rotate * Math.PI) / 180),
            }
          : {}),
        ...(el.opacity !== undefined ? { opacity: el.opacity } : {}),
      });
      return;
    }
  }
}

const lineCapOf = (cap: 'butt' | 'round' | 'square'): 0 | 1 | 2 =>
  cap === 'round' ? 1 : cap === 'square' ? 2 : 0;

/**
 * Rendert Seiten als PDF. Schriften werden eingebettet (Untermenge), damit
 * das PDF überall gleich aussieht und klein bleibt.
 */
export async function renderPdf(
  pages: readonly PageLayout[],
  fonts: FontSet,
  meta: PdfMetadata = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const embedded: Record<FontKey, PDFFont> = {
    display: await doc.embedFont(fonts.display, EMBED_OPTIONS),
    body: await doc.embedFont(fonts.body, EMBED_OPTIONS),
    bodyBold: await doc.embedFont(fonts.bodyBold, EMBED_OPTIONS),
  };

  doc.setProducer('raetselheft.ch');
  doc.setCreator(meta.creator ?? 'raetselheft.ch');
  if (meta.title) doc.setTitle(meta.title);
  if (meta.subject) doc.setSubject(meta.subject);
  if (meta.keywords?.length) doc.setKeywords([...meta.keywords]);

  for (const layout of pages) {
    const page = doc.addPage([layout.width * PT_PER_MM, layout.height * PT_PER_MM]);
    const ctx: DrawContext = { page, height: layout.height, fonts: embedded };
    for (const el of layout.elements) drawElement(ctx, el);
  }
  return doc.save();
}
