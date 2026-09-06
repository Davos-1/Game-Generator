import { FONT_FAMILIES, FONT_WEIGHTS } from './measure';
import {
  COLORS,
  MM_PER_PT,
  round3,
  type Element,
  type PageLayout,
  type Stroke,
} from './primitives';

export interface SvgOptions {
  /**
   * @font-face-Quellen für die drei Schriftrollen, z. B. Data-URLs oder Pfade.
   * Ohne Angabe verlässt sich das SVG auf im Dokument bereits geladene Fonts.
   */
  fontUrls?: Partial<Record<'display' | 'body' | 'bodyBold', string>>;
  /** Zusätzliche Attribute am <svg>-Element, z. B. class oder role. */
  attributes?: Record<string, string>;
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const n = (v: number): string => String(round3(v));

function strokeAttrs(stroke: Stroke): string {
  const parts = [`stroke="${stroke.color}"`, `stroke-width="${n(stroke.width)}"`];
  if (stroke.dash?.length) parts.push(`stroke-dasharray="${stroke.dash.map(n).join(' ')}"`);
  if (stroke.lineCap) parts.push(`stroke-linecap="${stroke.lineCap}"`);
  if (stroke.lineJoin) parts.push(`stroke-linejoin="${stroke.lineJoin}"`);
  return parts.join(' ');
}

function shapeAttrs(el: { fill?: string; stroke?: Stroke; opacity?: number }): string {
  const parts = [`fill="${el.fill ?? 'none'}"`];
  if (el.stroke) parts.push(strokeAttrs(el.stroke));
  if (el.opacity !== undefined) parts.push(`opacity="${el.opacity}"`);
  return parts.join(' ');
}

export function elementToSvg(el: Element): string {
  switch (el.type) {
    case 'rect': {
      const rx = el.rx ? ` rx="${n(el.rx)}"` : '';
      return `<rect x="${n(el.x)}" y="${n(el.y)}" width="${n(el.width)}" height="${n(el.height)}"${rx} ${shapeAttrs(el)}/>`;
    }
    case 'line':
      return `<line x1="${n(el.x1)}" y1="${n(el.y1)}" x2="${n(el.x2)}" y2="${n(el.y2)}" ${strokeAttrs(el.stroke)}${el.opacity !== undefined ? ` opacity="${el.opacity}"` : ''}/>`;
    case 'polyline':
      return `<polyline points="${el.points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="none" ${strokeAttrs(el.stroke)}${el.opacity !== undefined ? ` opacity="${el.opacity}"` : ''}/>`;
    case 'circle':
      return `<circle cx="${n(el.cx)}" cy="${n(el.cy)}" r="${n(el.r)}" ${shapeAttrs(el)}/>`;
    case 'path':
      return `<path d="${el.d}" ${shapeAttrs(el)}/>`;
    case 'text': {
      const anchor = el.align && el.align !== 'start' ? ` text-anchor="${el.align}"` : '';
      const transform = el.rotate
        ? ` transform="rotate(${n(el.rotate)} ${n(el.x)} ${n(el.y)})"`
        : '';
      const opacity = el.opacity !== undefined ? ` opacity="${el.opacity}"` : '';
      // Die viewBox rechnet in Millimetern, deshalb wird die Schriftgrösse von
      // Punkt in Millimeter umgerechnet und einheitenlos ausgegeben. Eine
      // Angabe in «pt» würde der Browser als CSS-Punkt in Benutzereinheiten
      // deuten und den Text um den Faktor 3,78 zu gross zeichnen.
      return `<text x="${n(el.x)}" y="${n(el.y)}" font-family="${FONT_FAMILIES[el.font]}" font-weight="${FONT_WEIGHTS[el.font]}" font-size="${n(el.size * MM_PER_PT)}" fill="${el.color ?? COLORS.ink}"${anchor}${transform}${opacity}>${esc(el.text)}</text>`;
    }
  }
}

/**
 * Rendert eine Seite als SVG-String. Die viewBox ist in Millimetern, die
 * Schriftgrössen in pt: dieselbe Rechnung wie im PDF. Kerning und Ligaturen
 * sind abgeschaltet, weil pdf-lib beim Zeichnen ebenfalls nur die reinen
 * Vorschubbreiten verwendet.
 */
export function pageToSvg(page: PageLayout, options: SvgOptions = {}): string {
  const extra = Object.entries(options.attributes ?? {})
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join('');
  const faces = Object.entries(options.fontUrls ?? {})
    .map(([key, url]) => {
      const font = key as keyof typeof FONT_FAMILIES;
      return `@font-face{font-family:'${FONT_FAMILIES[font]}';font-weight:${FONT_WEIGHTS[font]};font-style:normal;src:url('${url}') format('truetype');}`;
    })
    .join('');
  const style = `<style>${faces}text{font-kerning:none;font-variant-ligatures:none;white-space:pre;}</style>`;
  const body = page.elements.map(elementToSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n(page.width)} ${n(page.height)}" width="${n(page.width)}mm" height="${n(page.height)}mm"${extra}>${style}<rect width="${n(page.width)}" height="${n(page.height)}" fill="#ffffff"/>${body}</svg>`;
}
