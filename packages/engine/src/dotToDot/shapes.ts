/**
 * Kuratierte Umriss-Formen für Punkte-zu-Punkte, als geschlossene Polygone
 * auf einem 0–100-Feld. Bewusst als berechnete Geometrie statt eingekaufter
 * Illustrationen (gleicher Grund wie bei den Icons in packages/render):
 * keine Lizenzfragen, beliebig reproduzierbar.
 *
 * Jede Form ist EIN durchgehender Umriss (keine getrennten Teile), damit
 * eine einzige nummerierte Punktreihe sie beim Verbinden ergibt.
 */

export interface Shape {
  id: string;
  /** Eckpunkte im Uhrzeigersinn, auf einem Feld 0–100 (Rand ≥ 4). */
  vertices: readonly (readonly [number, number])[];
}

/** Fünfzackiger Stern um (cx, cy). */
function star(cx: number, cy: number, outerR: number, innerR: number): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

/** Herzform über die klassische parametrische Kurve, auf das Feld skaliert. */
function heart(cx: number, cy: number, scale: number, segments = 24): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    points.push([cx + x * scale, cy + y * scale]);
  }
  return points;
}

/** Haus-Silhouette: Rechteck mit Satteldach, ein durchgehender Umriss. */
function house(cx: number, cy: number, width: number, wallHeight: number, roofHeight: number) {
  const left = cx - width / 2;
  const right = cx + width / 2;
  const eaves = cy - wallHeight / 2;
  const ridge = eaves - roofHeight;
  const base = cy + wallHeight / 2;
  return [
    [cx, ridge],
    [right, eaves],
    [right, base],
    [left, base],
    [left, eaves],
  ] as [number, number][];
}

/** Nach oben zeigender Pfeil, ein durchgehender Umriss. */
function arrow(cx: number, cy: number, width: number, height: number): [number, number][] {
  const shaftHalf = width * 0.26;
  const headHalf = width * 0.5;
  const top = cy - height / 2;
  const headBase = top + height * 0.42;
  const bottom = cy + height / 2;
  return [
    [cx, top],
    [cx + headHalf, headBase],
    [cx + shaftHalf, headBase],
    [cx + shaftHalf, bottom],
    [cx - shaftHalf, bottom],
    [cx - shaftHalf, headBase],
    [cx - headHalf, headBase],
  ];
}

/** Stilisierter Tannenbaum: gestufte Dreiecke über einem Stamm, ein Umriss. */
function tree(cx: number, cy: number, width: number, height: number): [number, number][] {
  const trunkWidth = width * 0.16;
  const trunkHeight = height * 0.14;
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  const tierHeight = (height - trunkHeight) / 3;
  const tierWidths = [width * 0.35, width * 0.62, width * 0.9];
  const points: [number, number][] = [[cx, top]];
  tierWidths.forEach((tierWidth, i) => {
    const y = top + tierHeight * (i + 1);
    points.push([cx + tierWidth / 2, y], [cx + tierWidth * 0.3, y]);
  });
  points.push([cx + trunkWidth / 2, bottom - trunkHeight]);
  points.push([cx + trunkWidth / 2, bottom]);
  points.push([cx - trunkWidth / 2, bottom]);
  points.push([cx - trunkWidth / 2, bottom - trunkHeight]);
  tierWidths
    .slice()
    .reverse()
    .forEach((tierWidth, i) => {
      const y = top + tierHeight * (tierWidths.length - i);
      points.push([cx - tierWidth * 0.3, y], [cx - tierWidth / 2, y]);
    });
  return points;
}

export const SHAPES: readonly Shape[] = [
  { id: 'stern', vertices: star(50, 50, 42, 17) },
  { id: 'herz', vertices: heart(50, 46, 2.55) },
  { id: 'haus', vertices: house(50, 58, 64, 42, 26) },
  { id: 'pfeil', vertices: arrow(50, 50, 62, 92) },
  { id: 'tannenbaum', vertices: tree(50, 54, 68, 88) },
];

export const SHAPE_IDS: readonly string[] = SHAPES.map((shape) => shape.id);

export function shapeById(id: string): Shape {
  const shape = SHAPES.find((candidate) => candidate.id === id);
  if (!shape) throw new RangeError(`Unbekannte Punkte-zu-Punkte-Form: ${id}`);
  return shape;
}
