import { applyTheme, bootstrapTheme, isAppTheme, normalizeAppTheme } from './theme';

describe('theme utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('recognizes every supported theme', () => {
    expect(isAppTheme('default')).toBe(true);
    expect(isAppTheme('dark')).toBe(true);
    expect(isAppTheme('up-and-up')).toBe(true);
    expect(isAppTheme('baseball')).toBe(true);
    expect(isAppTheme('neon')).toBe(true);
    expect(isAppTheme('monokai')).toBe(true);
    expect(isAppTheme('sunset')).toBe(true);
    expect(isAppTheme('unknown')).toBe(false);
  });

  it('migrates the former blue-pink theme name to Baseball', () => {
    expect(normalizeAppTheme('blue-pink')).toBe('baseball');
    expect(normalizeAppTheme('unknown')).toBeNull();
  });

  it('applies and persists Monokai', () => {
    applyTheme('monokai');

    expect(document.documentElement.dataset.theme).toBe('monokai');
    expect(window.localStorage.getItem('iwyn-theme')).toBe('monokai');
  });

  it('applies and persists Sunset', () => {
    applyTheme('sunset');

    expect(document.documentElement.dataset.theme).toBe('sunset');
    expect(window.localStorage.getItem('iwyn-theme')).toBe('sunset');
  });

  it('applies and persists Up & Up independently from Default', () => {
    applyTheme('up-and-up');

    expect(document.documentElement.dataset.theme).toBe('up-and-up');
    expect(window.localStorage.getItem('iwyn-theme')).toBe('up-and-up');
  });

  it('restores a saved Monokai preference', () => {
    window.localStorage.setItem('iwyn-theme', 'monokai');

    bootstrapTheme();

    expect(document.documentElement.dataset.theme).toBe('monokai');
  });

  it('migrates a saved blue-pink preference to Baseball', () => {
    window.localStorage.setItem('iwyn-theme', 'blue-pink');

    bootstrapTheme();

    expect(document.documentElement.dataset.theme).toBe('baseball');
    expect(window.localStorage.getItem('iwyn-theme')).toBe('baseball');
  });
});
