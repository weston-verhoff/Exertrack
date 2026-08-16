import { DistanceUnit } from '../types/workout';

const METERS_PER_UNIT: Record<DistanceUnit, number> = {
  m: 1,
  km: 1000,
  mi: 1609.344,
  yd: 0.9144,
};

export const distanceToMeters = (value?: number | null, unit?: DistanceUnit | null) =>
  value != null && unit ? value * METERS_PER_UNIT[unit] : 0;

export const formatDuration = (seconds?: number | null) => {
  const safe = Math.max(0, Math.round(seconds ?? 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`;
};

export const paceSecondsPerUnit = (
  durationSeconds?: number | null,
  distanceValue?: number | null
) => durationSeconds && distanceValue && durationSeconds > 0 && distanceValue > 0
  ? durationSeconds / distanceValue
  : null;

export const speedPerHour = (
  durationSeconds?: number | null,
  distanceValue?: number | null
) => durationSeconds && distanceValue && durationSeconds > 0 && distanceValue > 0
  ? distanceValue / (durationSeconds / 3600)
  : null;
