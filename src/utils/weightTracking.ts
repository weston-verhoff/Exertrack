import { WeightSystem } from '../services/accountService';
import type { WeightEntry } from '../services/weightService';

const KILOGRAMS_PER_POUND = 0.45359237;

export const roundStoredKilograms = (kilograms: number) =>
  Math.round(kilograms * 1000) / 1000;

export const toStoredKilograms = (
  value: number,
  system: WeightSystem
) =>
  roundStoredKilograms(
    system === 'imperial' ? value * KILOGRAMS_PER_POUND : value
  );

export const fromStoredKilograms = (
  kilograms: number,
  system: WeightSystem
) => (system === 'imperial' ? kilograms / KILOGRAMS_PER_POUND : kilograms);

export const formatWeightValue = (
  kilograms: number,
  system: WeightSystem
) => Number(fromStoredKilograms(kilograms, system).toFixed(1));

export const formatWeightDisplay = (
  kilograms: number,
  system: WeightSystem
) => formatWeightValue(kilograms, system).toFixed(1);

export const getWeightUnit = (system: WeightSystem) =>
  system === 'imperial' ? 'lbs' : 'kg';

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatWeightEntriesAsCsv = (
  entries: WeightEntry[],
  system: WeightSystem
) => {
  const unit = getWeightUnit(system);
  return [
    'date,weight,unit',
    ...entries.map(entry => `${entry.weighed_on},${formatWeightDisplay(entry.weight_kg, system)},${unit}`),
  ].join('\n');
};

export const downloadCsvFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
