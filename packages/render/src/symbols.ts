/**
 * Geometrische Symbole für das Kinder-Sudoku: statt Ziffern werden 1..6 auf
 * einfache, klar unterscheidbare Formen abgebildet. Die Pfade sind bewusst
 * auf M/L/C/Z beschränkt (kein A-Befehl), damit sie sowohl im SVG als auch
 * über pdf-lib `drawSvgPath` funktionieren. Koordinaten in Millimetern.
 */

import { round3 } from './primitives';

export type SymbolName = 'circle' | 'square' | 'triangle' | 'star' | 'heart' | 'diamond';

/** Reihenfolge, in der Ziffern 1..6 auf Symbole abgebildet werden. */
export const SYMBOL_ORDER: readonly SymbolName[] = [
  'circle',
  'square',
  'triangle',
  'star',
  'heart',
  'diamond',
];

/** Kappa-Faktor für die Bézier-Approximation eines Kreisviertels. */
const KAPPA = 0.5523;

/** Rundet auf 3 Dezimalstellen (wie die übrigen Layout-Koordinaten). */
const n = (value: number): number => round3(value);

function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA;
  return [
    `M ${n(cx + r)} ${n(cy)}`,
    `C ${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}`,
    `C ${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}`,
    `C ${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}`,
    `C ${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}`,
    'Z',
  ].join(' ');
}

function squarePath(cx: number, cy: number, r: number): string {
  return [
    `M ${n(cx - r)} ${n(cy - r)}`,
    `L ${n(cx + r)} ${n(cy - r)}`,
    `L ${n(cx + r)} ${n(cy + r)}`,
    `L ${n(cx - r)} ${n(cy + r)}`,
    'Z',
  ].join(' ');
}

/** Gleichseitig wirkendes, nach oben zeigendes Dreieck, in das Quadrat einbeschrieben. */
function trianglePath(cx: number, cy: number, r: number): string {
  return [
    `M ${n(cx)} ${n(cy - r)}`,
    `L ${n(cx + r)} ${n(cy + r)}`,
    `L ${n(cx - r)} ${n(cy + r)}`,
    'Z',
  ].join(' ');
}

/** Fünfzackiger Stern, äusserer Radius r, innerer Radius ≈ 0.382·r. */
function starPath(cx: number, cy: number, r: number): string {
  const rInner = r * 0.382;
  const commands: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : rInner;
    const theta = (i * Math.PI) / 5; // 10 Punkte im 36°-Abstand, Spitze nach oben
    const x = cx + radius * Math.sin(theta);
    const y = cy - radius * Math.cos(theta);
    commands.push(`${i === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}

/** Herz aus zwei kubischen Bézier-Kurven (linker und rechter Bogen), Spitze unten. */
function heartPath(cx: number, cy: number, r: number): string {
  return [
    `M ${n(cx)} ${n(cy + r)}`,
    `C ${n(cx - r)} ${n(cy + r * 0.35)} ${n(cx - r)} ${n(cy - r * 0.6)} ${n(cx)} ${n(cy - r * 0.25)}`,
    `C ${n(cx + r)} ${n(cy - r * 0.6)} ${n(cx + r)} ${n(cy + r * 0.35)} ${n(cx)} ${n(cy + r)}`,
    'Z',
  ].join(' ');
}

/** Raute (um 45° gedrehtes Quadrat). */
function diamondPath(cx: number, cy: number, r: number): string {
  return [
    `M ${n(cx)} ${n(cy - r)}`,
    `L ${n(cx + r)} ${n(cy)}`,
    `L ${n(cx)} ${n(cy + r)}`,
    `L ${n(cx - r)} ${n(cy)}`,
    'Z',
  ].join(' ');
}

/**
 * SVG-Pfad (Attribut d) für ein Symbol, zentriert auf (cx, cy) mit Gesamtgrösse `size`
 * (Kantenlänge des umschliessenden Quadrats). Koordinaten in Millimetern, absolute
 * Befehle (M, L, C, Z), Zahlen auf 3 Dezimalstellen gerundet.
 */
export function symbolPath(name: SymbolName, cx: number, cy: number, size: number): string {
  const r = size / 2;
  switch (name) {
    case 'circle':
      return circlePath(cx, cy, r);
    case 'square':
      return squarePath(cx, cy, r);
    case 'triangle':
      return trianglePath(cx, cy, r);
    case 'star':
      return starPath(cx, cy, r);
    case 'heart':
      return heartPath(cx, cy, r);
    case 'diamond':
      return diamondPath(cx, cy, r);
    default: {
      const exhaustiveCheck: never = name;
      throw new RangeError(`Unbekanntes Symbol: ${String(exhaustiveCheck)}`);
    }
  }
}

/** Symbol für eine Ziffer 1..6 (1 = circle …). Wirft RangeError ausserhalb 1..6. */
export function symbolForDigit(digit: number): SymbolName {
  if (!Number.isInteger(digit) || digit < 1 || digit > 6) {
    throw new RangeError(`digit muss eine ganze Zahl zwischen 1 und 6 sein, erhalten: ${digit}`);
  }
  const symbol = SYMBOL_ORDER[digit - 1];
  if (symbol === undefined) {
    throw new RangeError(`digit muss eine ganze Zahl zwischen 1 und 6 sein, erhalten: ${digit}`);
  }
  return symbol;
}
