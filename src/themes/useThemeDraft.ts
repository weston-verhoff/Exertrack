import { useLayoutEffect, useMemo, useState } from 'react';
import { THEME_DEFINITIONS } from './definitions';
import { compileTheme } from './compiler';
import { CompiledTheme, ThemeDefinition } from './types';
import { AppTheme } from './registry.generated';
import { toLch } from './colorMath';
import { SandboxThemeDraft, draftGradientErrors, normalizeSurfaceBackground, surfaceBackground, isSolidSurfaceBackground } from './sandboxGradients';

const storageKey = 'iwyn-sandbox-drafts-v1';
function restore(): Record<string, SandboxThemeDraft> {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([id, draft]) => {
      const def = draft as ThemeDefinition;
      return THEME_DEFINITIONS.some(t => t.id === id) && def?.id === id && def?.seeds && typeof def.seeds === 'object';
    }).map(([id, draft]) => [id, normalizeSurfaceBackground(draft as SandboxThemeDraft)])) as Record<string, SandboxThemeDraft>;
  } catch { return {}; }
}
export function useThemeDraft(theme: AppTheme) {
  const [drafts, setDrafts] = useState(restore);
  const original = THEME_DEFINITIONS.find(t => t.id === theme)!;
  const baseline = useMemo(() => compileTheme(original), [original]);
  const draft: SandboxThemeDraft = drafts[theme] ?? original;
  const gradientErrors = draftGradientErrors(draft);
  const [acceptedGradients, setAcceptedGradients] = useState<Record<string, NonNullable<SandboxThemeDraft['gradients']>>>({});
  const gradients = {
    canvas: gradientErrors.canvas ? acceptedGradients[theme]?.canvas ?? '' : draft.gradients?.canvas ?? '',
    surface: gradientErrors.surface ? acceptedGradients[theme]?.surface ?? '' : surfaceBackground(draft) ?? '',
  };
  useLayoutEffect(() => {
    if (draft.mode === 'mixed') setAcceptedGradients(previous => ({ ...previous, [theme]: { canvas: gradients.canvas, surface: gradients.surface } }));
  }, [theme, draft.mode, gradients.canvas, gradients.surface]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-sandbox-gradient-mode', draft.mode);
    root.style.setProperty('--sandbox-canvas-gradient', draft.mode === 'mixed' ? gradients.canvas.trim() || 'none' : 'none');
    const solid = draft.mode === 'mixed' && isSolidSurfaceBackground(gradients.surface);
    root.style.setProperty('--sandbox-surface-gradient', draft.mode === 'mixed' && !solid ? gradients.surface.trim() || 'none' : 'none');
    if (solid) root.style.setProperty('--sandbox-surface-color', gradients.surface.trim());
    else root.style.removeProperty('--sandbox-surface-color');
    return () => {
      root.removeAttribute('data-sandbox-gradient-mode');
      root.style.removeProperty('--sandbox-canvas-gradient');
      root.style.removeProperty('--sandbox-surface-gradient');
      root.style.removeProperty('--sandbox-surface-color');
    };
  }, [draft.mode, gradients.canvas, gradients.surface]);
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
    const previousColorScheme = root.style.colorScheme;
    root.style.colorScheme = toLch(applied.tokens['--color-surface-default'])[0] < 0.6 ? 'dark' : 'light';
    const entries = Object.entries(applied.tokens).filter(([name]) => !name.startsWith('--image-brand-'));
    // Brand URLs remain bundled CSS assets. Draft palette values apply to the whole iframe, including portals.
    entries.forEach(([name, value]) => root.style.setProperty(name, value));
    return () => {
      entries.forEach(([name]) => root.style.removeProperty(name));
      root.style.colorScheme = previousColorScheme;
    };
  }, [applied, theme]);
  return {
    draft, compilation, applied,
    update: (next: SandboxThemeDraft) => setDrafts(previous => ({ ...previous, [theme]: normalizeSurfaceBackground(next) })),
    reset: () => setDrafts(previous => { const next = { ...previous }; delete next[theme]; return next; }),
  };
}
