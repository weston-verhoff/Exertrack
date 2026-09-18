export type AppTheme = 'default' | 'blue-pink';

const THEME_STORAGE_KEY = 'iwyn-theme';

export const isAppTheme = (value: unknown): value is AppTheme =>
  value === 'default' || value === 'blue-pink';

export const applyTheme = (theme: AppTheme) => {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const bootstrapTheme = () => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(isAppTheme(storedTheme) ? storedTheme : 'default');
};
