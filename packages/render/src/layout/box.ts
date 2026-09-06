import type { ContentBox } from '../page';
import type { Mm } from '../primitives';

/**
 * Verkleinert eine Box auf ein gewünschtes Seitenverhältnis und zentriert sie.
 * So belegt ein Rätsel immer die grösste Fläche, die hineinpasst, ohne zu verzerren.
 */
export function fitBox(box: ContentBox, aspect: number): ContentBox {
  const boxAspect = box.width / box.height;
  if (boxAspect > aspect) {
    const width = box.height * aspect;
    return { x: box.x + (box.width - width) / 2, y: box.y, width, height: box.height };
  }
  const height = box.width / aspect;
  return { x: box.x, y: box.y + (box.height - height) / 2, width: box.width, height };
}

/** Box mit gleichmässigem Innenabstand. */
export function inset(box: ContentBox, amount: Mm): ContentBox {
  return {
    x: box.x + amount,
    y: box.y + amount,
    width: Math.max(0, box.width - 2 * amount),
    height: Math.max(0, box.height - 2 * amount),
  };
}

/** Teilt eine Box in `rows` × `cols` gleich grosse Zellen mit Abstand `gap`. */
export function grid(box: ContentBox, rows: number, cols: number, gap: Mm): ContentBox[] {
  const width = (box.width - gap * (cols - 1)) / cols;
  const height = (box.height - gap * (rows - 1)) / rows;
  const cells: ContentBox[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ x: box.x + c * (width + gap), y: box.y + r * (height + gap), width, height });
    }
  }
  return cells;
}
