import { contrastRatio } from './themeContrast';

test('checks contrast without rounding a failure up to a pass', () => {
  expect(contrastRatio('#000000', '#ffffff')).toBe(21);
  expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
  expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
});

test('composites translucent text and leaves translucent backgrounds unscored', () => {
  expect(contrastRatio('rgba(0, 0, 0, 0.5)', 'rgb(255, 255, 255)')).toBeCloseTo(3.98, 2);
  expect(contrastRatio('#000000', 'rgba(255, 255, 255, 0.5)')).toBeNull();
  expect(contrastRatio('var(--missing)', '#ffffff')).toBeNull();
});
