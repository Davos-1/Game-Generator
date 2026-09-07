import { describe, expect, it } from 'vitest';
import { isActive, normalizePath } from './nav';

describe('normalizePath', () => {
  it('entfernt die Dateiendung aus dem Build-Format «file»', () => {
    expect(normalizePath('/sudoku.html')).toBe('/sudoku');
    expect(normalizePath('/index.html')).toBe('/');
  });

  it('entfernt den abschliessenden Schrägstrich, ausser bei der Startseite', () => {
    expect(normalizePath('/labyrinth/')).toBe('/labyrinth');
    expect(normalizePath('/')).toBe('/');
  });
});

describe('isActive', () => {
  it('markiert den Rätseltyp auch auf dessen Themen-Seiten', () => {
    expect(isActive('/wortsuchraetsel/piraten-kindergeburtstag', '/wortsuchraetsel')).toBe(true);
  });

  it('markiert die Startseite nur auf der Startseite', () => {
    expect(isActive('/', '/')).toBe(true);
    expect(isActive('/sudoku', '/')).toBe(false);
  });

  it('verwechselt keine Adressen mit gleichem Anfang', () => {
    expect(isActive('/sudoku-kinder', '/sudoku')).toBe(false);
  });

  it('ist gegenüber Schrägstrich und Endung unempfindlich', () => {
    expect(isActive('/labyrinth.html', '/labyrinth')).toBe(true);
    expect(isActive('/labyrinth/', '/labyrinth')).toBe(true);
  });
});
