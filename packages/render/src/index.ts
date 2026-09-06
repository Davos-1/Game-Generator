/**
 * @raetselheft/render
 *
 * Layout-Schicht zwischen Rätsel-Engine und Ausgabe: Rätsel werden in
 * abstrakte Layout-Primitive (mm) übersetzt, die sowohl als SVG-Vorschau als
 * auch als PDF gezeichnet werden. Damit sind Vorschau und Druck garantiert
 * identisch (PLAN.md Abschnitt 6.1).
 */
export * from './primitives';
export { createMeasurer, FONT_FAMILIES, FONT_FILES, FONT_WEIGHTS } from './fonts';
export type { FontSet, TextMeasurer } from './fonts';
export { createPage, fitText, watermarkElements, MARGIN, ptToMm } from './page';
export type { ContentBox, PageFrame, PageFrameOptions } from './page';
export { fitBox, grid, inset } from './layout/box';
export { wordSearchElements } from './layout/wordsearch';
export type { WordSearchDrawOptions } from './layout/wordsearch';
export { mazeElements } from './layout/maze';
export type { MazeDrawOptions } from './layout/maze';
export { sudokuElements, sudokuLegendElements } from './layout/sudoku';
export type { SudokuDrawOptions } from './layout/sudoku';
export { puzzlePage, solutionPages } from './pages';
export type { PuzzleItem, PuzzlePageOptions } from './pages';
export { pageToSvg, elementToSvg } from './svg';
export type { SvgOptions } from './svg';
export { renderPdf } from './pdf';
export type { PdfMetadata } from './pdf';
export { symbolPath, symbolForDigit, SYMBOL_ORDER } from './symbols';
export type { SymbolName } from './symbols';
