export const APP_THEMES = ['default', 'dark', 'up-and-up', 'baseball', 'neon', 'monokai', 'sunset'] as const;

export type AppTheme = (typeof APP_THEMES)[number];

const THEME_STORAGE_KEY = 'iwyn-theme';

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === 'string' && APP_THEMES.some((theme) => theme === value);

export const normalizeAppTheme = (value: unknown): AppTheme | null => {
  if (value === 'blue-pink') return 'baseball';
  return isAppTheme(value) ? value : null;
};

export const applyTheme = (theme: AppTheme) => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const bootstrapTheme = () => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(normalizeAppTheme(storedTheme) ?? 'default');
};
