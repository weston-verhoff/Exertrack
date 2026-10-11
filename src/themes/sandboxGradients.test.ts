import { gradientError, surfaceBackgroundError, normalizeSurfaceBackground, surfaceBackground } from './sandboxGradients';
import { THEME_DEFINITIONS } from './definitions';

const supports = jest.fn(() => true);
beforeEach(() => {
  Object.defineProperty(globalThis, 'CSS', { configurable: true, value: { supports } });
  supports.mockReset().mockReturnValue(true);
});

test.each([
  'linear-gradient(to bottom, #76b4ff, #fff0a0)',
  'radial-gradient(circle, rgb(239, 99, 45), #5925a0)',
  'conic-gradient(from 45deg, red, blue)',
  'repeating-linear-gradient(90deg, red 0 10px, blue 10px 20px)',
  'repeating-radial-gradient(circle, red, blue)',
  'repeating-conic-gradient(red 0deg 10deg, blue 10deg 20deg)',
])('accepts a browser-supported gradient: %s', value => {
  expect(gradientError(value)).toBeUndefined();
  expect(supports).toHaveBeenCalledWith('background-image', value);
});
test.each(['', '   ', undefined])('empty gradients restore the fallback', value => {
  expect(gradientError(value)).toBeUndefined();
  expect(supports).not.toHaveBeenCalled();
});
test.each([
  'url(https://example.com/image.png)', 'red',
  'linear-gradient(red, blue), radial-gradient(red, blue)',
  'linear-gradient(red, blue); color: red',
  'linear-gradient(red, url(example.png))',
  'linear-gradient(red, var(--unknown))',
  'linear-gradient(red, blue',
])('rejects disallowed syntax: %s', value => {
  expect(gradientError(value)).toBeTruthy();
});
test('rejects syntax unsupported by the browser', () => {
  supports.mockReturnValue(false);
  expect(gradientError('linear-gradient(bogus)')).toBeTruthy();
});

test('solid colors bypass gradient support checks but require six-digit hex syntax', () => {
  supports.mockReturnValue(false);
  expect(surfaceBackgroundError(' #1D2D40 ')).toBeUndefined();
  expect(supports).not.toHaveBeenCalled();
  for (const value of ['#123', '#12345678', 'red', 'rgb(0,0,0)', 'url(image.png)']) expect(surfaceBackgroundError(value)).toBeTruthy();
  expect(surfaceBackgroundError('')).toBeUndefined();
});

test('normalizes legacy surface gradients and respects explicit empty overrides', () => {
  const original = THEME_DEFINITIONS[0];
  const legacy = { ...original, gradients: { canvas: 'linear-gradient(white, black)', surface: 'linear-gradient(red, blue)' } };
  const normalized = normalizeSurfaceBackground(legacy);
  expect(normalized.surfaceBackground).toBe(legacy.gradients.surface);
  expect(normalized.gradients).toEqual({ canvas: legacy.gradients.canvas });
  expect(legacy.gradients.surface).toBe('linear-gradient(red, blue)');
  expect(surfaceBackground(normalizeSurfaceBackground({ ...legacy, surfaceBackground: '' }))).toBe('');
});
