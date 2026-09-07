/**
 * Eigene Icon-Pfade für die Themen-Designs.
 *
 * Bewusst als Code statt als eingekaufte Illustrationen: keine Lizenzfragen,
 * beliebig skalierbar, winzig im PDF. Alle Pfade sind auf (cx, cy) zentriert,
 * passen in ein Quadrat der Kantenlänge `size` und verwenden nur M/L/C/Z,
 * damit sie in SVG und über pdf-lib gleich gezeichnet werden.
 */
import { round3 } from './primitives';

export type IconName =
  | 'ship'
  | 'chest'
  | 'anchor'
  | 'compass'
  | 'unicorn'
  | 'rainbow'
  | 'cloud'
  | 'sparkle'
  | 'leaf'
  | 'palm'
  | 'sun'
  | 'ring'
  | 'heart'
  | 'flower'
  | 'flag'
  | 'tree'
  | 'gift'
  | 'snowflake';

const n = (value: number): number => round3(value);

const polygon = (points: readonly (readonly [number, number])[]): string =>
  `${points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${n(x)} ${n(y)}`).join(' ')} Z`;

/**
 * Kreis aus vier kubischen Bézier-Bögen (kappa). `reverse` dreht den
 * Umlaufsinn um: gegenläufige Teilpfade schneiden beim Füllen ein Loch
 * (Nonzero-Regel, gilt in SVG wie im PDF). Ohne das verschmelzen
 * ineinanderliegende Formen zu einer einzigen Fläche.
 */
function circle(cx: number, cy: number, r: number, reverse = false): string {
  const k = r * 0.5523;
  // Beide Varianten starten oben; der Gegenuhrzeigersinn läuft über links.
  const arcs = reverse
    ? [
        `C ${n(cx - k)} ${n(cy - r)} ${n(cx - r)} ${n(cy - k)} ${n(cx - r)} ${n(cy)}`,
        `C ${n(cx - r)} ${n(cy + k)} ${n(cx - k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}`,
        `C ${n(cx + k)} ${n(cy + r)} ${n(cx + r)} ${n(cy + k)} ${n(cx + r)} ${n(cy)}`,
        `C ${n(cx + r)} ${n(cy - k)} ${n(cx + k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}`,
      ]
    : [
        `C ${n(cx + k)} ${n(cy - r)} ${n(cx + r)} ${n(cy - k)} ${n(cx + r)} ${n(cy)}`,
        `C ${n(cx + r)} ${n(cy + k)} ${n(cx + k)} ${n(cy + r)} ${n(cx)} ${n(cy + r)}`,
        `C ${n(cx - k)} ${n(cy + r)} ${n(cx - r)} ${n(cy + k)} ${n(cx - r)} ${n(cy)}`,
        `C ${n(cx - r)} ${n(cy - k)} ${n(cx - k)} ${n(cy - r)} ${n(cx)} ${n(cy - r)}`,
      ];
  return [`M ${n(cx)} ${n(cy - r)}`, ...arcs, 'Z'].join(' ');
}

/** Rechteck mit umgekehrtem Umlaufsinn: schneidet ein Loch in die Fläche darunter. */
const hole = (x1: number, y1: number, x2: number, y2: number): string =>
  polygon([
    [x1, y1],
    [x1, y2],
    [x2, y2],
    [x2, y1],
  ]);

/** Ringförmiger Bogen (Regenbogen, Ring) als geschlossene Fläche. */
function arcBand(cx: number, cy: number, outer: number, inner: number): string {
  const ko = outer * 0.5523;
  const ki = inner * 0.5523;
  return [
    `M ${n(cx - outer)} ${n(cy)}`,
    `C ${n(cx - outer)} ${n(cy - ko)} ${n(cx - ko)} ${n(cy - outer)} ${n(cx)} ${n(cy - outer)}`,
    `C ${n(cx + ko)} ${n(cy - outer)} ${n(cx + outer)} ${n(cy - ko)} ${n(cx + outer)} ${n(cy)}`,
    `L ${n(cx + inner)} ${n(cy)}`,
    `C ${n(cx + inner)} ${n(cy - ki)} ${n(cx + ki)} ${n(cy - inner)} ${n(cx)} ${n(cy - inner)}`,
    `C ${n(cx - ki)} ${n(cy - inner)} ${n(cx - inner)} ${n(cy - ki)} ${n(cx - inner)} ${n(cy)}`,
    'Z',
  ].join(' ');
}

type IconBuilder = (cx: number, cy: number, size: number) => string;

const BUILDERS: Readonly<Record<IconName, IconBuilder>> = {
  // Segelschiff: Rumpf als Trapez, zwei Segel als Dreiecke.
  ship: (cx, cy, size) => {
    const s = size / 2;
    const hull = polygon([
      [cx - s, cy + s * 0.25],
      [cx + s, cy + s * 0.25],
      [cx + s * 0.6, cy + s * 0.8],
      [cx - s * 0.6, cy + s * 0.8],
    ]);
    const sail = polygon([
      [cx + s * 0.05, cy - s],
      [cx + s * 0.05, cy + s * 0.1],
      [cx + s * 0.8, cy + s * 0.1],
    ]);
    const jib = polygon([
      [cx - s * 0.1, cy - s * 0.75],
      [cx - s * 0.1, cy + s * 0.1],
      [cx - s * 0.75, cy + s * 0.1],
    ]);
    return `${hull} ${sail} ${jib}`;
  },
  // Schatztruhe: Kasten mit Deckel und Schloss.
  chest: (cx, cy, size) => {
    const s = size / 2;
    const body = polygon([
      [cx - s, cy - s * 0.05],
      [cx + s, cy - s * 0.05],
      [cx + s, cy + s * 0.8],
      [cx - s, cy + s * 0.8],
    ]);
    const lid = polygon([
      [cx - s, cy - s * 0.22],
      [cx - s * 0.72, cy - s * 0.8],
      [cx + s * 0.72, cy - s * 0.8],
      [cx + s, cy - s * 0.22],
    ]);
    // Schloss als Aussparung, damit die Truhe nicht als Klecks erscheint.
    const lock = hole(cx - s * 0.14, cy + s * 0.12, cx + s * 0.14, cy + s * 0.5);
    return `${lid} ${body} ${lock}`;
  },
  anchor: (cx, cy, size) => {
    const s = size / 2;
    const shaft = polygon([
      [cx - s * 0.12, cy - s * 0.55],
      [cx + s * 0.12, cy - s * 0.55],
      [cx + s * 0.12, cy + s * 0.75],
      [cx - s * 0.12, cy + s * 0.75],
    ]);
    const bar = polygon([
      [cx - s * 0.6, cy - s * 0.35],
      [cx + s * 0.6, cy - s * 0.35],
      [cx + s * 0.6, cy - s * 0.15],
      [cx - s * 0.6, cy - s * 0.15],
    ]);
    const fluke = polygon([
      [cx - s * 0.85, cy + s * 0.2],
      [cx - s * 0.6, cy + s * 0.2],
      [cx, cy + s * 0.85],
      [cx + s * 0.6, cy + s * 0.2],
      [cx + s * 0.85, cy + s * 0.2],
      [cx, cy + s],
    ]);
    return `${circle(cx, cy - s * 0.72, s * 0.22)} ${shaft} ${bar} ${fluke}`;
  },
  compass: (cx, cy, size) => {
    const s = size / 2;
    const needle = polygon([
      [cx, cy - s * 0.62],
      [cx + s * 0.24, cy],
      [cx, cy + s * 0.62],
      [cx - s * 0.24, cy],
    ]);
    // Aussenring (Loch innen) plus Nadel.
    return `${circle(cx, cy, s)} ${circle(cx, cy, s * 0.76, true)} ${needle}`;
  },
  // Einhorn-Horn mit Windungen.
  unicorn: (cx, cy, size) => {
    const s = size / 2;
    const horn = polygon([
      [cx, cy - s],
      [cx + s * 0.32, cy + s * 0.85],
      [cx - s * 0.32, cy + s * 0.85],
    ]);
    const stripe = (offset: number, width: number): string =>
      polygon([
        [cx - width, cy + offset],
        [cx + width, cy + offset],
        [cx + width * 0.86, cy + offset + s * 0.12],
        [cx - width * 0.86, cy + offset + s * 0.12],
      ]);
    return `${horn} ${stripe(-s * 0.25, s * 0.16)} ${stripe(s * 0.15, s * 0.24)}`;
  },
  rainbow: (cx, cy, size) => {
    const s = size / 2;
    return [
      arcBand(cx, cy + s * 0.5, s, s * 0.75),
      arcBand(cx, cy + s * 0.5, s * 0.62, s * 0.37),
      arcBand(cx, cy + s * 0.5, s * 0.24, s * 0.02),
    ].join(' ');
  },
  cloud: (cx, cy, size) => {
    const s = size / 2;
    const base = polygon([
      [cx - s * 0.85, cy + s * 0.1],
      [cx + s * 0.85, cy + s * 0.1],
      [cx + s * 0.85, cy + s * 0.45],
      [cx - s * 0.85, cy + s * 0.45],
    ]);
    return `${circle(cx - s * 0.45, cy, s * 0.4)} ${circle(cx + s * 0.05, cy - s * 0.2, s * 0.52)} ${circle(cx + s * 0.6, cy + s * 0.02, s * 0.36)} ${base}`;
  },
  // Vierzackiger Funkelstern.
  sparkle: (cx, cy, size) => {
    const s = size / 2;
    const w = s * 0.22;
    return polygon([
      [cx, cy - s],
      [cx + w, cy - w],
      [cx + s, cy],
      [cx + w, cy + w],
      [cx, cy + s],
      [cx - w, cy + w],
      [cx - s, cy],
      [cx - w, cy - w],
    ]);
  },
  leaf: (cx, cy, size) => {
    const s = size / 2;
    return [
      `M ${n(cx)} ${n(cy - s)}`,
      `C ${n(cx + s * 0.95)} ${n(cy - s * 0.4)} ${n(cx + s * 0.7)} ${n(cy + s * 0.7)} ${n(cx)} ${n(cy + s)}`,
      `C ${n(cx - s * 0.7)} ${n(cy + s * 0.7)} ${n(cx - s * 0.95)} ${n(cy - s * 0.4)} ${n(cx)} ${n(cy - s)}`,
      'Z',
    ].join(' ');
  },
  palm: (cx, cy, size) => {
    const s = size / 2;
    const trunk = polygon([
      [cx - s * 0.12, cy - s * 0.1],
      [cx + s * 0.12, cy - s * 0.1],
      [cx + s * 0.2, cy + s],
      [cx - s * 0.2, cy + s],
    ]);
    const frond = (dx: number, dy: number): string =>
      polygon([
        [cx, cy - s * 0.2],
        [cx + dx, cy + dy - s * 0.35],
        [cx + dx * 0.85, cy + dy],
      ]);
    return `${trunk} ${frond(-s * 0.9, -s * 0.15)} ${frond(s * 0.9, -s * 0.15)} ${frond(-s * 0.5, -s * 0.6)} ${frond(s * 0.5, -s * 0.6)}`;
  },
  sun: (cx, cy, size) => {
    const s = size / 2;
    const rays = Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4;
      const inner = s * 0.62;
      const outer = s;
      const w = 0.13;
      return polygon([
        [cx + Math.cos(angle - w) * inner, cy + Math.sin(angle - w) * inner],
        [cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer],
        [cx + Math.cos(angle + w) * inner, cy + Math.sin(angle + w) * inner],
      ]);
    });
    return `${circle(cx, cy, s * 0.55)} ${rays.join(' ')}`;
  },
  // Ehering mit Stein.
  ring: (cx, cy, size) => {
    const s = size / 2;
    const stone = polygon([
      [cx, cy - s],
      [cx + s * 0.28, cy - s * 0.62],
      [cx, cy - s * 0.3],
      [cx - s * 0.28, cy - s * 0.62],
    ]);
    return `${circle(cx, cy + s * 0.22, s * 0.72)} ${circle(cx, cy + s * 0.22, s * 0.5, true)} ${stone}`;
  },
  heart: (cx, cy, size) => {
    const s = size / 2;
    // Kontrollpunkte bleiben innerhalb des Quadrats, damit das Herz in einer
    // Sudoku-Zelle nie in die Nachbarzelle ragt.
    return [
      `M ${n(cx)} ${n(cy + s * 0.9)}`,
      `C ${n(cx - s)} ${n(cy)} ${n(cx - s * 0.62)} ${n(cy - s)} ${n(cx)} ${n(cy - s * 0.3)}`,
      `C ${n(cx + s * 0.62)} ${n(cy - s)} ${n(cx + s)} ${n(cy)} ${n(cx)} ${n(cy + s * 0.9)}`,
      'Z',
    ].join(' ');
  },
  flower: (cx, cy, size) => {
    const s = size / 2;
    const petals = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3;
      return circle(cx + Math.cos(angle) * s * 0.66, cy + Math.sin(angle) * s * 0.66, s * 0.34);
    });
    // Mitte als Aussparung: die Blüte bleibt auch klein als Blume erkennbar.
    return `${petals.join(' ')} ${circle(cx, cy, s * 0.34)} ${circle(cx, cy, s * 0.16, true)}`;
  },
  // Tannenbaum: drei Stufen und ein Stamm.
  tree: (cx, cy, size) => {
    const s = size / 2;
    const tier = (top: number, halfWidth: number, bottom: number): string =>
      polygon([
        [cx, cy + top],
        [cx + halfWidth, cy + bottom],
        [cx - halfWidth, cy + bottom],
      ]);
    const trunk = polygon([
      [cx - s * 0.14, cy + s * 0.72],
      [cx + s * 0.14, cy + s * 0.72],
      [cx + s * 0.14, cy + s],
      [cx - s * 0.14, cy + s],
    ]);
    return `${tier(-s, s * 0.42, -s * 0.35)} ${tier(-s * 0.6, s * 0.62, s * 0.1)} ${tier(-s * 0.15, s * 0.82, s * 0.72)} ${trunk}`;
  },
  // Geschenk: Schachtel mit Band als Aussparung und Schleife.
  gift: (cx, cy, size) => {
    const s = size / 2;
    const box = polygon([
      [cx - s * 0.86, cy - s * 0.3],
      [cx + s * 0.86, cy - s * 0.3],
      [cx + s * 0.86, cy + s],
      [cx - s * 0.86, cy + s],
    ]);
    const lid = polygon([
      [cx - s, cy - s * 0.55],
      [cx + s, cy - s * 0.55],
      [cx + s, cy - s * 0.25],
      [cx - s, cy - s * 0.25],
    ]);
    const ribbon = hole(cx - s * 0.12, cy - s * 0.25, cx + s * 0.12, cy + s);
    const bow = `${circle(cx - s * 0.3, cy - s * 0.75, s * 0.24)} ${circle(cx + s * 0.3, cy - s * 0.75, s * 0.24)}`;
    return `${bow} ${lid} ${box} ${ribbon}`;
  },
  // Schneeflocke: sechs Arme mit kurzen Verzweigungen.
  snowflake: (cx, cy, size) => {
    const s = size / 2;
    const arms = Array.from({ length: 6 }, (_, i) => {
      const angle = (i * Math.PI) / 3;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      // Kräftig genug, damit die Flocke auch klein gedruckt sichtbar bleibt.
      const w = 0.13;
      const nx = -dy * s * w;
      const ny = dx * s * w;
      const main = polygon([
        [cx + nx, cy + ny],
        [cx + dx * s + nx * 0.4, cy + dy * s + ny * 0.4],
        [cx + dx * s - nx * 0.4, cy + dy * s - ny * 0.4],
        [cx - nx, cy - ny],
      ]);
      const branchAt = 0.58;
      const branch = (sign: number): string => {
        const bAngle = angle + sign * 0.9;
        const bx = cx + dx * s * branchAt;
        const by = cy + dy * s * branchAt;
        return polygon([
          [bx + nx * 0.6, by + ny * 0.6],
          [bx + Math.cos(bAngle) * s * 0.34, by + Math.sin(bAngle) * s * 0.34],
          [bx - nx * 0.6, by - ny * 0.6],
        ]);
      };
      return `${main} ${branch(1)} ${branch(-1)}`;
    });
    return `${arms.join(' ')} ${circle(cx, cy, s * 0.16)}`;
  },
  flag: (cx, cy, size) => {
    const s = size / 2;
    const pole = polygon([
      [cx - s * 0.85, cy - s],
      [cx - s * 0.65, cy - s],
      [cx - s * 0.65, cy + s],
      [cx - s * 0.85, cy + s],
    ]);
    const cloth = polygon([
      [cx - s * 0.65, cy - s * 0.9],
      [cx + s * 0.9, cy - s * 0.5],
      [cx - s * 0.65, cy - s * 0.1],
    ]);
    return `${pole} ${cloth}`;
  },
};

export const ICON_NAMES = Object.keys(BUILDERS) as IconName[];

/** SVG-Pfad für ein Icon, zentriert auf (cx, cy) in der Grösse `size` (mm). */
export function iconPath(name: IconName, cx: number, cy: number, size: number): string {
  return BUILDERS[name](cx, cy, size);
}
