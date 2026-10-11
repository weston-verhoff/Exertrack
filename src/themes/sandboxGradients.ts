import { ThemeDefinition } from './types';

export type SandboxThemeDraft = ThemeDefinition;

export const isSolidSurfaceBackground = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value.trim());

export function surfaceBackground(draft: ThemeDefinition) {
  return draft.surfaceBackground !== undefined ? draft.surfaceBackground : draft.gradients?.surface;
}

export function normalizeSurfaceBackground(draft: ThemeDefinition): ThemeDefinition {
  if (draft.gradients?.surface === undefined) return draft;
  const { surface, ...gradients } = draft.gradients;
  return { ...draft, surfaceBackground: draft.surfaceBackground ?? surface, gradients };
}

export function surfaceBackgroundSyntaxError(value: unknown) {
  if (isSolidSurfaceBackground(value)) return;
  const error = gradientSyntaxError(value);
  return error ? 'Enter a six-digit hex color (#RRGGBB) or a single CSS gradient.' : undefined;
}

export function surfaceBackgroundError(value: unknown) {
  if (isSolidSurfaceBackground(value)) return;
  return surfaceBackgroundSyntaxError(value) ?? gradientError(value);
}

export function gradientSyntaxError(value: unknown): string | undefined {
  if (value === undefined || value === '') return;
  if (typeof value !== 'string') return 'Enter a CSS gradient string.';
  const gradient = value.trim();
  if (!gradient) return;
  // Require exactly one gradient function; commas inside its arguments are valid.
  if (!/^(repeating-)?(linear|radial|conic)-gradient\(/i.test(gradient)
    || /(?:url|var|env)\s*\(/i.test(gradient) || /[;{}]/.test(gradient)) {
    return 'Enter a single CSS gradient, without URLs or image layers.';
  }
  let depth = 0;
  for (let i = gradient.indexOf('('); i < gradient.length; i++) {
    if (gradient[i] === '(') depth++;
    if (gradient[i] === ')') depth--;
    if (depth < 0 || (depth === 0 && i !== gradient.length - 1)) return 'Enter a single CSS gradient, without image layers.';
  }
  if (depth !== 0) return 'Enter a complete CSS gradient.';
}

export function gradientError(value: unknown): string | undefined {
  const error = gradientSyntaxError(value);
  if (error) return error;
  if (typeof value === 'string' && value.trim() && !globalThis.CSS?.supports('background-image', value.trim())) return 'This browser does not support this gradient syntax.';
}

export function draftGradientErrors(draft: SandboxThemeDraft) {
  return draft.mode === 'mixed' ? {
    canvas: gradientError(draft.gradients?.canvas),
    surface: surfaceBackgroundError(surfaceBackground(draft)),
  } : {};
}
