import { describe, expect, it } from 'vitest';
import { t } from './index';

describe('t()', () => {
  it('löst verschachtelte Schlüssel auf', () => {
    expect(t('site.name')).toBe('Rätselheft');
  });

  it('gibt bei unbekanntem Schlüssel den Schlüssel zurück', () => {
    expect(t('gibt.es.nicht')).toBe('gibt.es.nicht');
  });

  it('enthält kein ß (Schweizer Standarddeutsch)', () => {
    const raw = JSON.stringify(t('home.intro') + t('site.description'));
    expect(raw).not.toMatch(/ß/);
  });
});
