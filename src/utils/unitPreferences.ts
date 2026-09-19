import { DistanceUnit } from '../types/workout';

export type MeasurementSystem = 'imperial' | 'metric';

export const DISTANCE_UNIT_OPTIONS: Record<
  MeasurementSystem,
  ReadonlyArray<{ value: DistanceUnit; label: string }>
> = {
  imperial: [
    { value: 'mi', label: 'Miles (mi)' },
    { value: 'yd', label: 'Yards (yd)' },
  ],
  metric: [
    { value: 'km', label: 'Kilometers (km)' },
    { value: 'm', label: 'Meters (m)' },
  ],
};

export const getDefaultDistanceUnit = (
  system: MeasurementSystem
): DistanceUnit => (system === 'metric' ? 'km' : 'mi');

export const getDistanceUnitOptions = (system: MeasurementSystem) =>
  DISTANCE_UNIT_OPTIONS[system];

export const normalizeDistanceUnit = (
  unit: DistanceUnit | null | undefined,
  system: MeasurementSystem
): DistanceUnit =>
  DISTANCE_UNIT_OPTIONS[system].some(option => option.value === unit)
    ? (unit as DistanceUnit)
    : getDefaultDistanceUnit(system);

export const getWeightUnitLabel = (system: MeasurementSystem) =>
  system === 'metric' ? 'KG' : 'LBS';
