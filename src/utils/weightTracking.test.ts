import {
  formatWeightValue,
  fromStoredKilograms,
  getLocalDateKey,
  roundStoredKilograms,
  toStoredKilograms,
} from './weightTracking';

describe('weight tracking conversions', () => {
  it('stores metric values at kilogram precision', () => {
    expect(toStoredKilograms(82.4567, 'metric')).toBe(82.457);
    expect(roundStoredKilograms(82.4564)).toBe(82.456);
  });

  it('round trips imperial values without rewriting stored history', () => {
    const stored = toStoredKilograms(175, 'imperial');
    expect(stored).toBe(79.379);
    expect(formatWeightValue(stored, 'imperial')).toBe(175.001);
    expect(toStoredKilograms(formatWeightValue(stored, 'imperial'), 'imperial')).toBe(
      stored
    );
    expect(fromStoredKilograms(stored, 'metric')).toBe(stored);
  });

  it('formats local dates without UTC rollover', () => {
    expect(getLocalDateKey(new Date(2026, 8, 24, 23, 45))).toBe('2026-09-24');
  });
});
