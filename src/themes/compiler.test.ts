import { compileTheme } from './compiler';
import { THEME_DEFINITIONS } from './definitions';
import { fromLch, toLch } from './colorMath';
import { THEME_TOKEN_CONTRACT, BRAND_IMAGE_TOKEN_CONTRACT, OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT } from '../utils/colorTokens';
import { contrastRatio } from '../utils/themeContrast';

describe.each(THEME_DEFINITIONS)('$name compiler', definition => {
  const result = compileTheme(definition);
  test('is deterministic, complete, and validates final output', () => {
    expect(result.diagnostics.filter(d => d.severity === 'error')).toEqual([]);
    expect(result.valid).toBe(true);
    expect(compileTheme(definition)).toEqual(result);
    [...THEME_TOKEN_CONTRACT, ...BRAND_IMAGE_TOKEN_CONTRACT, ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT].forEach(token => {
      expect(result.tokens[token]).toBeTruthy(); expect(result.provenance[token]).toBeTruthy();
    });
    result.pairings.forEach(pair => expect(contrastRatio(result.tokens[pair.foreground], result.tokens[pair.background])).toBeGreaterThanOrEqual(pair.minimum));
  });
  test('keeps functional surfaces opaque', () => {
    Object.entries(result.tokens).filter(([name]) => /--color-(?:surface-|interactive-|feedback-)/.test(name)).forEach(([, value]) => expect(value).toMatch(/^#[\da-f]{6}$/i));
  });
});

test.each(['#ffffcc', '#0000ff', '#898989'])('handles difficult primary %s without changing input', primary => {
  const original = THEME_DEFINITIONS[0];
  const definition = { ...original, seeds: { ...original.seeds, primary } };
  const before = JSON.stringify(definition);
  const result = compileTheme(definition);
  expect(JSON.stringify(definition)).toBe(before);
  expect(result.valid).toBe(true);
  result.pairings.forEach(pair => expect(contrastRatio(result.tokens[pair.foreground], result.tokens[pair.background])).toBeGreaterThanOrEqual(pair.minimum));
});

test('rejects missing colors, mode conflicts, low text contrast and semantic collisions', () => {
  const original = THEME_DEFINITIONS[0];
  for (const seeds of [{ ...original.seeds, primary: 'red' }, { ...original.seeds, text: original.seeds.surface }, { ...original.seeds, danger: original.seeds.success }, { ...original.seeds, primary: original.seeds.secondary }]) {
    expect(compileTheme({ ...original, seeds }).valid).toBe(false);
  }
  expect(compileTheme({ ...original, mode: 'dark' }).valid).toBe(false);
  expect(compileTheme({ ...original, generatorVersion: 2 } as never).valid).toBe(false);
});

test('family overrides regenerate aliases and dependent pairings with provenance', () => {
  const original = THEME_DEFINITIONS[0];
  const result = compileTheme({ ...original, overrides: { primary: { color: '#8238bd', reason: 'Review alternate purple identity' } } });
  expect(result.valid).toBe(true);
  expect(result.tokens['--color-accent-primary']).not.toEqual(compileTheme(original).tokens['--color-accent-primary']);
  expect(result.tokens['--color-accent-primary']).toBe(result.tokens['--color-interactive-primary']);
  expect(result.provenance['--color-accent-primary'].source).toContain('Review alternate');
  expect(compileTheme({ ...original, overrides: { primary: { color: '#8238bd', reason: '' } } }).valid).toBe(false);
});

test('mixed text seeds are independent, validated and ignored by light/dark generation', () => {
  const original = THEME_DEFINITIONS[0];
  const mixed = { ...original, mode: 'mixed' as const, seeds: { ...original.seeds, canvas: '#c2ddff', surface: '#272039', onCanvas: '#102a43', onSurface: '#fff4df' } };
  const result = compileTheme(mixed);
  expect(result.valid).toBe(true);
  expect(result.tokens['--color-on-canvas']).toBe('#102a43');
  expect(result.tokens['--color-on-surface']).toBe('#fff4df');
  expect(result.provenance['--color-on-canvas'].source).toBe('onCanvas');
  expect(result.provenance['--color-on-surface'].source).toBe('onSurface');
  const changedCanvas = compileTheme({ ...mixed, seeds: { ...mixed.seeds, onCanvas: '#241b3b' } });
  expect(changedCanvas.tokens['--color-on-surface']).toBe(result.tokens['--color-on-surface']);
  const changedSurface = compileTheme({ ...mixed, seeds: { ...mixed.seeds, onSurface: '#e8f8ff' } });
  expect(changedSurface.tokens['--color-on-canvas']).toBe(result.tokens['--color-on-canvas']);
  for (const name of ['onSurface', 'onCanvas']) {
    expect(compileTheme({ ...mixed, seeds: { ...mixed.seeds, [name]: '#bad' } }).valid).toBe(false);
  }
  expect(compileTheme({ ...original, seeds: { ...original.seeds, onCanvas: '#bad', onSurface: '#bad' } })).toEqual(compileTheme(original));
});

test('OKLCH roundtrips sRGB reference colors and maps excess chroma into gamut', () => {
  ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ff2ca8', '#272822'].forEach(value => expect(fromLch(toLch(value))).toBe(value));
  const value = fromLch([0.65, 0.6, 1.2]);
  expect(value).toMatch(/^#[\da-f]{6}$/);
  const [lightness, chroma] = toLch(value);
  expect(lightness).toBeCloseTo(0.65, 2);
  expect(chroma).toBeLessThan(0.6);
});

test.each([
  { canvas: '#c2ddff', surface: '#272039' },
  { canvas: '#151326', surface: '#f3eaff' },
])('mixed supports independent canvas and surface foregrounds: %o', anchors => {
  const original = THEME_DEFINITIONS.find(theme => theme.id === 'sunset')!;
  const definition = { ...original, gradients: undefined, surfaceBackground: undefined, mode: 'mixed' as const, seeds: { ...original.seeds, ...anchors } };
  const result = compileTheme(definition);
  expect(result.valid).toBe(true);
  expect(result.tokens['--color-surface-canvas']).toBe(anchors.canvas);
  expect(result.tokens['--color-surface-default']).toBe(anchors.surface);
  expect(result.tokens['--color-on-canvas']).not.toBe(result.tokens['--color-on-surface']);
  expect(result.tokens['--image-surface-canvas']).toBe('none');
  expect(result.tokens['--image-surface-hero']).toBe('none');
  result.pairings.forEach(pair => expect(contrastRatio(result.tokens[pair.foreground], result.tokens[pair.background])).toBeGreaterThanOrEqual(pair.minimum));
  expect(compileTheme({ ...definition, mode: 'light' }).valid).toBe(false);
  expect(compileTheme({ ...definition, mode: 'dark' }).valid).toBe(false);
});

test('Sunset ships its explicit gradients only in Mixed mode', () => {
  const sunset = THEME_DEFINITIONS.find(theme => theme.id === 'sunset')!;
  const result = compileTheme(sunset);
  expect(result.valid).toBe(true);
  expect(result.tokens['--image-surface-canvas']).toBe(sunset.gradients!.canvas);
  expect(result.tokens['--image-surface-default']).toBe(sunset.surfaceBackground);
  expect(result.tokens['--image-surface-hero']).toBe(sunset.surfaceBackground);
  const light = THEME_DEFINITIONS[0];
  expect(compileTheme({ ...light, gradients: sunset.gradients })).toEqual(compileTheme(light));
  expect(compileTheme({ ...sunset, gradients: { canvas: 'url(example.png)' } }).valid).toBe(false);
});

test('solid surface overrides preserve palette generation and support legacy precedence', () => {
  const baseball = THEME_DEFINITIONS.find(theme => theme.id === 'baseball')!;
  const result = compileTheme(baseball);
  expect(result.valid).toBe(true);
  expect(result.tokens['--color-surface-artwork']).toBe('#1D2D40');
  expect(result.tokens['--color-surface-default']).toBe('#000000');
  expect(result.tokens['--image-surface-default']).toBe('none');
  expect(result.tokens['--image-surface-hero']).toBe('none');
  const plain = compileTheme({ ...baseball, surfaceBackground: '' });
  expect(result.tokens['--color-on-surface']).toBe(plain.tokens['--color-on-surface']);
  expect(result.tokens['--color-interactive-primary']).toBe(plain.tokens['--color-interactive-primary']);
  const legacy = { ...baseball, surfaceBackground: undefined, gradients: { surface: 'linear-gradient(red, blue)' } };
  expect(compileTheme(legacy).tokens['--image-surface-default']).toBe(legacy.gradients.surface);
  expect(compileTheme({ ...legacy, surfaceBackground: '' }).tokens['--image-surface-default']).toBeUndefined();
  expect(compileTheme({ ...baseball, surfaceBackground: '#bad' }).valid).toBe(false);
});
