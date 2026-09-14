/**
 * Bilder fürs Nonogramm.
 *
 * Statt eigener Bilddaten werden die kuratierten Umriss-Formen aus
 * `../dotToDot/shapes` weiterverwendet: Sie liegen bereits als geschlossene
 * Polygone auf einem 0–100-Feld vor, sind lizenzfrei berechnet und ergeben
 * als Silhouette gefüllt genau die Art Motiv, die sich in einem groben Gitter
 * noch erkennen lässt. Gerastert wird mit reiner Geometrie (Punkt-in-Polygon),
 * damit die Engine wie gefordert ohne Browser- und Zeichen-Abhängigkeiten
 * auskommt.
 */
import { SHAPES } from '../dotToDot/shapes';

export interface Picture {
  id: string;
  vertices: readonly (readonly [number, number])[];
}

/**
 * Rückt eine Form mittig und so gross wie möglich ins 0–100-Feld. Ohne das
 * sässe etwa das Haus mit seinem hohen Dach sichtbar zu weit oben und liesse
 * unten mehrere Gitterzeilen leer — im Nonogramm verschenkte Fläche.
 */
function fitToField(vertices: readonly (readonly [number, number])[]): readonly [number, number][] {
  const xs = vertices.map(([x]) => x);
  const ys = vertices.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  // Seitenverhältnis bleibt erhalten, sonst verzerrt die Silhouette.
  const scale = 100 / Math.max(maxX - minX, maxY - minY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return vertices.map(([x, y]) => [50 + (x - cx) * scale, 50 + (y - cy) * scale]);
}

export const PICTURES: readonly Picture[] = SHAPES.map((shape) => ({
  id: shape.id,
  vertices: fitToField(shape.vertices),
}));

export const PICTURE_IDS: readonly string[] = PICTURES.map((picture) => picture.id);

export function pictureById(id: string): Picture {
  const picture = PICTURES.find((candidate) => candidate.id === id);
  if (!picture) throw new RangeError(`Unbekanntes Nonogramm-Bild: ${id}`);
  return picture;
}

/**
 * Wie die Form vor dem Rastern auf dem Feld liegt. Kleine Verschiebungen und
 * Grössenänderungen ergeben spürbar verschiedene Gitterbilder derselben Form
 * — das gibt dem Seed etwas zu entscheiden und dem Generator Ausweichmöglich-
 * keiten, falls eine Lage nicht ohne Raten lösbar ist.
 */
export interface PictureVariant {
  scale: number;
  dx: number;
  dy: number;
}

const SCALES = [1, 0.94, 0.88, 0.82] as const;
const OFFSETS = [0, -4, 4] as const;

/**
 * Alle Lagen, die der Generator durchprobieren darf. Gespiegelt wird nicht:
 * alle kuratierten Formen sind links-rechts-symmetrisch, ein Spiegelbild
 * wäre also dasselbe Rätsel.
 */
export const PICTURE_VARIANTS: readonly PictureVariant[] = SCALES.flatMap((scale) =>
  OFFSETS.flatMap((dx) => OFFSETS.map((dy) => ({ scale, dx, dy }))),
);

/** Punkt-in-Polygon nach der Ungerade-Regel (Strahl nach rechts). */
function contains(x: number, y: number, polygon: readonly (readonly [number, number])[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i] as readonly [number, number];
    const b = polygon[j] as readonly [number, number];
    const [ax, ay] = a;
    const [bx, by] = b;
    if (ay > y !== by > y && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/**
 * Rastert eine Form in ein `size × size`-Gitter: Ein Feld wird ausgemalt,
 * wenn sein Mittelpunkt innerhalb des Umrisses liegt.
 */
export function rasterize(picture: Picture, size: number, variant: PictureVariant): boolean[] {
  const polygon = picture.vertices.map(
    ([x, y]) =>
      [50 + (x - 50) * variant.scale + variant.dx, 50 + (y - 50) * variant.scale + variant.dy] as [
        number,
        number,
      ],
  );

  const cells: boolean[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push(contains(((col + 0.5) / size) * 100, ((row + 0.5) / size) * 100, polygon));
    }
  }
  return cells;
}
