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
    Object.entries(result.tokens).filter(([name]) => /--color-(?:surface-|interactive-|feedback-)/.test(name)).forEach(([, value]) => expect(value).toMatch(/^#[\da-f]{6}$/));
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

test('OKLCH roundtrips sRGB reference colors and maps excess chroma into gamut', () => {
  ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ff2ca8', '#272822'].forEach(value => expect(fromLch(toLch(value))).toBe(value));
  const value = fromLch([0.65, 0.6, 1.2]);
  expect(value).toMatch(/^#[\da-f]{6}$/);
  const [lightness, chroma] = toLch(value);
  expect(lightness).toBeCloseTo(0.65, 2);
  expect(chroma).toBeLessThan(0.6);
});
