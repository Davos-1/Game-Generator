/**
 * Welcher Navigationspunkt zur aktuellen Adresse gehört. Die Kopfzeile
 * markierte bisher nie, wo man ist; auf den Themen-Seiten unterhalb eines
 * Rätseltyps (/wortsuchraetsel/piraten-kindergeburtstag) muss der Eintrag
 * des Rätseltyps ebenfalls aktiv sein.
 */
export function normalizePath(pathname: string): string {
  const clean = pathname.replace(/index\.html$/, '').replace(/\.html$/, '');
  if (clean.length > 1 && clean.endsWith('/')) return clean.slice(0, -1);
  return clean === '' ? '/' : clean;
}

export function isActive(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (target === '/') return current === '/';
  return current === target || current.startsWith(`${target}/`);
}
