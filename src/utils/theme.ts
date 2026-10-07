import { APP_THEMES, AppTheme } from '../themes/registry.generated';
export { APP_THEMES, THEME_OPTIONS } from '../themes/registry.generated';
export type { AppTheme } from '../themes/registry.generated';

const THEME_STORAGE_KEY = 'iwyn-theme';
const THEME_TRANSITION_DURATION = 420;
let transitionCleanupTimer: ReturnType<typeof setTimeout> | null = null;

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

export const isAppTheme = (value: unknown): value is AppTheme =>
  typeof value === 'string' && APP_THEMES.some((theme) => theme === value);

export const normalizeAppTheme = (value: unknown): AppTheme | null => {
  if (value === 'blue-pink') return 'baseball';
  return isAppTheme(value) ? value : null;
};

export const applyTheme = (
  theme: AppTheme,
  { animate = false }: { animate?: boolean } = {}
) => {
  const root = document.documentElement;
  const commitTheme = () => {
    root.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!animate || reducedMotion || root.dataset.theme === theme) {
    commitTheme();
    return;
  }

  const transitionDocument = document as ViewTransitionDocument;
  if (transitionDocument.startViewTransition) {
    transitionDocument.startViewTransition(commitTheme);
    return;
  }

  if (transitionCleanupTimer) clearTimeout(transitionCleanupTimer);
  root.classList.add('theme-transitioning');
  void root.offsetWidth;
  commitTheme();
  transitionCleanupTimer = setTimeout(() => {
    root.classList.remove('theme-transitioning');
    transitionCleanupTimer = null;
  }, THEME_TRANSITION_DURATION);
};

export const bootstrapTheme = () => {
  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  applyTheme(normalizeAppTheme(storedTheme) ?? 'default');
};
