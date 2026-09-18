import { applyTheme, bootstrapTheme, isAppTheme } from './theme';

describe('theme utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('recognizes every supported theme', () => {
    expect(isAppTheme('default')).toBe(true);
    expect(isAppTheme('blue-pink')).toBe(true);
    expect(isAppTheme('monokai')).toBe(true);
    expect(isAppTheme('unknown')).toBe(false);
  });

  it('applies and persists Monokai', () => {
    applyTheme('monokai');

    expect(document.documentElement.dataset.theme).toBe('monokai');
    expect(window.localStorage.getItem('iwyn-theme')).toBe('monokai');
  });

  it('restores a saved Monokai preference', () => {
    window.localStorage.setItem('iwyn-theme', 'monokai');

    bootstrapTheme();

    expect(document.documentElement.dataset.theme).toBe('monokai');
  });
});
