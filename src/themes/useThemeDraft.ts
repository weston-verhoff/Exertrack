import { useLayoutEffect, useMemo, useState } from 'react';
import { THEME_DEFINITIONS } from './definitions';
import { compileTheme } from './compiler';
import { CompiledTheme, ThemeDefinition } from './types';
import { AppTheme } from './registry.generated';

const storageKey = 'iwyn-sandbox-drafts-v1';
function restore(): Record<string, ThemeDefinition> {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, draft]) => {
      const def = draft as ThemeDefinition;
      return THEME_DEFINITIONS.some(t => t.id === id) && def?.id === id && def?.seeds && typeof def.seeds === 'object';
    })) as Record<string, ThemeDefinition>;
  } catch { return {}; }
}
export function useThemeDraft(theme: AppTheme) {
  const [drafts, setDrafts] = useState(restore);
  const original = THEME_DEFINITIONS.find(t => t.id === theme)!;
  const baseline = useMemo(() => compileTheme(original), [original]);
  const draft = drafts[theme] ?? original;
  const compilation = useMemo(() => compileTheme(draft), [draft]);
  const [accepted, setAccepted] = useState<Record<string, CompiledTheme>>(() => ({ [theme]: baseline }));
  const applied = compilation.valid ? compilation : accepted[theme] ?? baseline;
  useLayoutEffect(() => {
    if (compilation.valid) setAccepted(previous => ({ ...previous, [theme]: compilation }));
  }, [compilation, theme]);
  useLayoutEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(drafts)); } catch { /* Draft still works if storage is unavailable. */ }
  }, [drafts]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    const entries = Object.entries(applied.tokens).filter(([name]) => !name.startsWith('--image-brand-'));
    // Brand URLs remain bundled CSS assets. Draft palette values apply to the whole iframe, including portals.
    entries.forEach(([name, value]) => root.style.setProperty(name, value));
    return () => entries.forEach(([name]) => root.style.removeProperty(name));
  }, [applied, theme]);
  return {
    draft, compilation, applied,
    update: (next: ThemeDefinition) => setDrafts(previous => ({ ...previous, [theme]: next })),
    reset: () => setDrafts(previous => { const next = { ...previous }; delete next[theme]; return next; }),
  };
}
