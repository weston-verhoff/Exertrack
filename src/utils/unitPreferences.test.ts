import {
  getDefaultDistanceUnit,
  getDistanceUnitOptions,
  getWeightUnitLabel,
  normalizeDistanceUnit,
} from './unitPreferences';

describe('unit preferences', () => {
  it('limits distance choices to the selected measurement system', () => {
    expect(getDistanceUnitOptions('imperial').map(option => option.value)).toEqual([
      'mi',
      'yd',
    ]);
    expect(getDistanceUnitOptions('metric').map(option => option.value)).toEqual([
      'km',
      'm',
    ]);
  });

  it('uses the preferred system default for missing or incompatible units', () => {
    expect(getDefaultDistanceUnit('imperial')).toBe('mi');
    expect(getDefaultDistanceUnit('metric')).toBe('km');
    expect(normalizeDistanceUnit('yd', 'imperial')).toBe('yd');
    expect(normalizeDistanceUnit('mi', 'metric')).toBe('km');
    expect(normalizeDistanceUnit(null, 'metric')).toBe('km');
  });

  it('provides the strength label for the preferred weight system', () => {
    expect(getWeightUnitLabel('imperial')).toBe('LBS');
    expect(getWeightUnitLabel('metric')).toBe('KG');
  });
});
