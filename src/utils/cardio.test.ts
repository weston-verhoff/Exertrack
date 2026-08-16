import { distanceToMeters, formatDuration, paceSecondsPerUnit, speedPerHour } from './cardio';

describe('cardio metric helpers', () => {
  test('normalizes supported distance units', () => {
    expect(distanceToMeters(1, 'mi')).toBeCloseTo(1609.344);
    expect(distanceToMeters(1, 'km')).toBe(1000);
    expect(distanceToMeters(100, 'yd')).toBeCloseTo(91.44);
  });

  test('formats durations and derives pace and speed safely', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(paceSecondsPerUnit(1800, 3)).toBe(600);
    expect(speedPerHour(1800, 3)).toBe(6);
    expect(paceSecondsPerUnit(0, 3)).toBeNull();
    expect(speedPerHour(1800, 0)).toBeNull();
  });
});
