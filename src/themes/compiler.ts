import { THEME_TOKEN_CONTRACT, BRAND_IMAGE_TOKEN_CONTRACT, OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT, THEME_CONTRAST_PAIRS } from '../utils/colorTokens';
import { contrastRatio } from '../utils/themeContrast';
import { fromLch, rgba, toLch, tone } from './colorMath';
import { CompiledTheme, FamilyName, SEED_NAMES, ThemeDefinition } from './types';

const families: FamilyName[] = ['primary', 'secondary', 'info', 'success', 'danger'];
const hex = /^#[\da-f]{6}$/i;
const ratio = (a: string, b: string) => contrastRatio(a, b) ?? 0;

/** No DOM, filesystem, time, or random input: build and draft preview share this compiler. */
export function compileTheme(definition: ThemeDefinition): CompiledTheme {
  const result: CompiledTheme = { tokens: {}, diagnostics: [], provenance: {}, pairings: [], valid: false };
  const { tokens, diagnostics, provenance, pairings } = result;
  const error = (message: string, token?: string) => diagnostics.push({ severity: 'error', message, token });
  if (!definition || !/^[a-z][a-z0-9-]*$/.test(definition.id) || typeof definition.name !== 'string' || !definition.name.trim()) error('Theme requires a safe ID and a display name.');
  if (definition?.generatorVersion !== 1) error('Unsupported generator version.');
  if (!['light', 'dark'].includes(definition?.mode)) error('Mode must be light or dark.');
  for (const name of SEED_NAMES) if (!hex.test(definition?.seeds?.[name] ?? '')) error(`${name} must be a six-digit hex color.`);
  if (definition?.decoration && !['none', 'atmosphere'].includes(definition.decoration)) error('Unknown decoration.');
  if (definition?.brand && !['default', 'neon'].includes(definition.brand)) error('Unknown brand asset family.');
  for (const [name, override] of Object.entries(definition?.overrides ?? {})) {
    if (!families.includes(name as FamilyName) || !hex.test(override?.color ?? '') || typeof override?.reason !== 'string' || !override.reason.trim()) error(`Override ${name} requires a known family, hex color and reason.`);
  }
  if (diagnostics.length) return result;
  const { seeds, mode } = definition;
  const dark = mode === 'dark';
  if ([seeds.canvas, seeds.surface].some(bg => ratio(seeds.text, bg) < 4.5)) error('Text anchor must contrast with canvas and surface anchors at 4.5:1.');
  if ([seeds.canvas, seeds.surface].some(bg => dark ? toLch(bg)[0] > 0.45 : toLch(bg)[0] < 0.85)) error('Surface anchors must be dark (L ≤ 0.45) or light (L ≥ 0.85) for the chosen mode.');
  if (diagnostics.length) return result;
  const source = (family: FamilyName) => definition.overrides?.[family]?.color ?? seeds[family];
  const put = (name: string, value: string, seed: string, rule: string) => {
    tokens[name] = value; provenance[name] = { source: seed, rule };
  };
  const color = (name: string, value: string, seed: string, rule = name) => put(`--color-${name}`, value, seed, rule);
  const alias = (name: string, original: string) => {
    put(`--color-${name}`, tokens[`--color-${original}`], provenance[`--color-${original}`].source, `Alias of ${original}`);
  };
  const need = (background: string, foreground: string, minimum = 4.5, purpose = 'Text') => pairings.push({ background: `--color-${background}`, foreground: `--color-${foreground}`, minimum, purpose });
  // Search the closest serialized lightness that satisfies every supported backdrop.
  function fit(seed: string, backgrounds: string[], minimum: number, label: string, boundaries: string[] = []): string {
    const passes = (candidate: string, margin = 0) => backgrounds.every(bg => ratio(candidate, bg) >= minimum + margin)
      && boundaries.every(bg => ratio(candidate, bg) >= 3 + margin);
    if (passes(seed)) return seed.toLowerCase();
    const [L, C, H] = toLch(seed);
    const candidates = Array.from({ length: 1001 }, (_, i) => i / 1000).sort((a, b) => Math.abs(a - L) - Math.abs(b - L));
    for (const lightness of candidates) {
      if (Math.abs(lightness - L) > 0.48) continue;
      const candidate = fromLch([lightness, C, H]);
      if (passes(candidate, 0.03)) {
        if (Math.abs(lightness - L) > 0.15) diagnostics.push({ severity: 'warning', message: `${label}: lightness adjusted by ${Math.abs(lightness - L).toFixed(2)} to satisfy contrast.` });
        return candidate;
      }
    }
    error(`${label}: no color meets all contrast constraints within the adjustment limit.`);
    return seed;
  }
  const surfaceL = toLch(seeds.surface)[0];
  const base: Record<string, string> = {
    'surface-canvas': seeds.canvas, 'surface-default': seeds.surface,
    'surface-raised': tone(seeds.surface, Math.min(0.99, surfaceL + (dark ? 0.035 : -0.025)), 0.04),
    'surface-sunken': tone(seeds.surface, Math.max(0.12, surfaceL - (dark ? 0.035 : 0.06)), 0.04),
    'surface-inverse': tone(seeds.surface, dark ? Math.max(0.12, surfaceL - 0.06) : 0.98, 0.035),
  };
  Object.entries(base).forEach(([name, value]) => color(name, value, name === 'surface-canvas' ? 'canvas' : 'surface', 'Mode surface hierarchy'));
  alias('surface-inverse-subtle', 'surface-raised');
  alias('surface-overlay', 'surface-inverse');
  const familyData = Object.fromEntries(families.map(name => {
    const seed = source(name);
    const subtle = tone(seed, dark ? Math.min(0.39, surfaceL + 0.025) : 0.95, 0.045);
    const subtleHover = tone(seed, dark ? Math.min(0.42, surfaceL + 0.055) : 0.92, 0.055);
    return [name, { seed, subtle, subtleHover }];
  })) as Record<FamilyName, { seed: string; subtle: string; subtleHover: string }>;
  const backdrops = [...Object.values(base), ...Object.values(familyData).flatMap(f => [f.subtle, f.subtleHover])];
  const text = fit(seeds.text, backdrops, 4.5, 'Body text');
  const muted = fit(tone(seeds.text, dark ? 0.72 : 0.48, 0.025), backdrops, 4.5, 'Muted text');
  ['on-canvas', 'on-surface', 'on-inverse'].forEach(name => color(name, text, 'text', 'Foreground across supported surfaces'));
  ['content-secondary', 'content-muted', 'on-inverse-muted'].forEach(name => color(name, muted, 'text', 'Muted foreground across supported surfaces'));
  color('border-subtle', tone(seeds.surface, dark ? surfaceL + 0.1 : surfaceL - 0.13, 0.025), 'surface', 'Decorative separator');
  const border = fit(tone(seeds.surface, dark ? 0.62 : 0.55, 0.025), backdrops, 3, 'Control boundary');
  ['border-default', 'border-strong', 'border-on-inverse'].forEach(name => color(name, border, 'surface', 'Essential boundary'));
  color('border-focus', fit(source('primary'), backdrops, 3, 'Focus ring'), 'primary', 'Focus against supported surfaces');
  const subtleBase = base['surface-sunken'];
  color('interactive-subtle', subtleBase, 'surface');
  color('interactive-subtle-hover', base['surface-raised'], 'surface');
  color('on-interactive-subtle', text, 'text');
  color('hover-on-inverse', base['surface-raised'], 'surface');

  for (const name of families) {
    const { seed, subtle, subtleHover } = familyData[name];
    const origin = definition.overrides?.[name] ? `override.${name}: ${definition.overrides[name]!.reason}` : name;
    const foreground = dark ? tone(seeds.canvas, 0.12, 0.02) : '#ffffff';
    const solid = fit(seed, [foreground], 4.5, `${name} solid`, backdrops);
    const hover = fit(tone(solid, toLch(solid)[0] + (dark ? 0.045 : -0.045)), [foreground], 4.5, `${name} hover`, backdrops);
    const pressed = fit(tone(solid, toLch(solid)[0] + (dark ? 0.075 : -0.075)), [foreground], 4.5, `${name} pressed`, backdrops);
    const onSubtle = fit(tone(seed, dark ? 0.8 : 0.4), backdrops, 4.5, `${name} contextual text`);
    const familyBorder = fit(seed, backdrops, 3, `${name} border`);
    // Internal role values are flattened to the public contract below.
    if (name === 'primary' || name === 'secondary') {
      color(`accent-${name}`, solid, origin); color(`on-accent-${name}`, foreground, 'text');
      color(`accent-${name}-subtle`, subtle, origin); color(`on-accent-${name}-subtle`, onSubtle, origin);
      color(`border-accent-${name}`, familyBorder, origin); color(`hover-on-accent-${name}`, hover, origin);
    }
    if (name !== 'info') {
      const role = name === 'success' ? 'positive' : name;
      color(`interactive-${role}`, solid, origin); color(`on-interactive-${role}`, foreground, 'text');
      color(`interactive-${role}-hover`, hover, origin); color(`interactive-${role}-pressed`, pressed, origin);
      if (name === 'success' || name === 'danger') {
        color(`interactive-${role}-subtle`, subtle, origin); color(`interactive-${role}-subtle-hover`, subtleHover, origin);
        color(`on-interactive-${role}-subtle`, onSubtle, origin); color(`border-${role}`, familyBorder, origin);
      }
      need(`interactive-${role}-pressed`, `on-interactive-${role}`);
      Object.keys(base).forEach(bg => ['','-hover','-pressed'].forEach(state => need(bg, `interactive-${role}${state}`, 3, 'Filled control boundary')));
    }
    if (['info', 'success', 'danger'].includes(name)) {
      color(`feedback-${name}-surface`, subtle, origin); color(`on-feedback-${name}`, onSubtle, origin); color(`feedback-${name}-border`, familyBorder, origin);
    }
  }
  alias('on-inverse-danger', 'on-interactive-danger-subtle');
  alias('interactive-selected', 'accent-primary-subtle'); alias('on-interactive-selected', 'on-accent-primary-subtle'); alias('border-selected', 'border-accent-primary');
  color('transparent', 'rgba(0, 0, 0, 0)', 'surface');
  color('overlay-backdrop', rgba(seeds.canvas, dark ? 0.76 : 0.65), 'canvas');
  ['primary', 'secondary', 'success'].forEach((name, i) => {
    const chart = fit(source(name as FamilyName), Object.values(base), 3, `Chart ${i + 1}`);
    color(`chart-series-${i + 1}`, chart, name, 'Chart stroke contrast');
    color(`chart-series-${i + 1}-fill`, rgba(chart, 0.12), name, 'Decorative chart fill');
    Object.keys(base).forEach(bg => need(bg, `chart-series-${i + 1}`, 3, 'Chart stroke'));
  });
  const shadowLevels = { subtle: 0.08, soft: 0.14, medium: 0.18, strong: 0.28, 'button-inset': 0.06, 'button-hover-inset': 0.1, 'button-pressed': 0.16, 'control-inset': 0.06 };
  Object.entries(shadowLevels).forEach(([name, alpha]) => put(`--shadow-${name}`, rgba('#000000', dark ? alpha * 1.4 : alpha), 'canvas', 'Shared shadow scale'));
  const decorative = definition.decoration === 'atmosphere';
  const tint1 = tone(source('primary'), toLch(seeds.canvas)[0] + 0.025, 0.035);
  const tint2 = tone(source('secondary'), toLch(seeds.canvas)[0] + 0.015, 0.035);
  put('--image-surface-canvas', decorative ? `linear-gradient(135deg, ${tint1}, ${seeds.canvas}, ${tint2})` : 'none', 'primary, secondary, canvas', 'Decorative atmosphere');
  // Opaque hero backing keeps foreground constraints independent of artwork.
  put('--image-surface-hero', decorative ? `linear-gradient(135deg, ${familyData.primary.subtle}, ${base['surface-inverse']}, ${familyData.secondary.subtle})` : 'none', 'primary, secondary, surface', 'Decorative hero');
  put('--image-surface-accent', 'none', 'surface', 'Functional surfaces stay solid');
  const brand = definition.brand === 'neon' ? 'neon' : 'default';
  const suffix = brand === 'default' && !dark ? '-alternate' : '';
  const extension = brand === 'neon' ? 'png' : 'webp';
  for (const [token, asset] of [['mark', 'mark'], ['mark-alternate', 'mark'], ['wordmark', 'wordmark']]) {
    put(`--image-brand-${token}`, `url('../assets/branding/${brand}/${asset}${suffix}.${extension}')`, 'brand, mode', 'Brand asset on mode surfaces');
  }
  THEME_CONTRAST_PAIRS.forEach(([bg, fg]) => pairings.push({ background: bg, foreground: fg, minimum: 4.5, purpose: 'Text' }));
  const supported = [...Object.keys(base), 'surface-inverse-subtle', 'surface-overlay', 'accent-primary-subtle', 'accent-secondary-subtle', 'interactive-positive-subtle', 'interactive-positive-subtle-hover', 'interactive-danger-subtle', 'interactive-danger-subtle-hover', 'feedback-info-surface', 'feedback-success-surface', 'feedback-danger-surface'];
  supported.forEach(bg => {
    ['on-surface', 'content-muted', 'content-secondary', 'on-interactive-positive-subtle', 'on-interactive-danger-subtle'].forEach(fg => need(bg, fg));
    ['border-strong', 'border-focus', 'border-positive', 'border-danger'].forEach(fg => need(bg, fg, 3, 'Essential boundary / focus'));
  });
  for (const pairing of pairings) {
    if (ratio(tokens[pairing.foreground], tokens[pairing.background]) < pairing.minimum) error(`${pairing.foreground} on ${pairing.background} fails ${pairing.minimum}:1.`, pairing.foreground);
  }
  [...THEME_TOKEN_CONTRACT, ...BRAND_IMAGE_TOKEN_CONTRACT, ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT].forEach(token => {
    if (!tokens[token]) error(`Missing output ${token}.`, token);
  });
  for (const [a, b] of [['primary', 'secondary'], ['success', 'danger'], ['primary', 'danger']] as [FamilyName, FamilyName][]) {
    const x = toLch(source(a)), y = toLch(source(b));
    const distance = Math.hypot(x[0] - y[0], x[1] * Math.cos(x[2]) - y[1] * Math.cos(y[2]), x[1] * Math.sin(x[2]) - y[1] * Math.sin(y[2]));
    if (distance < 0.035) error(`${a} and ${b} anchors are too similar; choose distinct semantic colors.`);
  }
  diagnostics.push({ severity: 'warning', message: 'Visually review hierarchy, chart differentiation, focus visibility and decorative artwork. Contrast checks do not establish overall accessibility.' });
  result.valid = !diagnostics.some(d => d.severity === 'error');
  return result;
}
