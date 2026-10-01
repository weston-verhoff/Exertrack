import type { Weekday } from '../services/accountService';

export type ChartGranularity = 'daily' | 'weekly';

export interface DatedChartValue {
  date: string;
  value: number;
}

export interface ChartPoint extends DatedChartValue {
  label: string;
}

const parseLocalDate = (dateKey: string) => new Date(`${dateKey}T00:00:00`);

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDailyLabel = (dateKey: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    parseLocalDate(dateKey)
  );

export const getWeekRange = (dateKey: string, startOfWeek: Weekday) => {
  const start = parseLocalDate(dateKey);
  const offset = (start.getDay() - startOfWeek + 7) % 7;
  start.setDate(start.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateKey(start), end: toDateKey(end) };
};

export const formatWeekRangeLabel = (startKey: string, endKey: string) => {
  const start = parseLocalDate(startKey);
  const end = parseLocalDate(endKey);
  return `${start.getMonth() + 1}/${start.getDate()}–${end.getMonth() + 1}/${end.getDate()}`;
};

export const aggregateChartValues = (
  values: DatedChartValue[],
  granularity: ChartGranularity,
  startOfWeek: Weekday
): ChartPoint[] => {
  const totals = new Map<string, { end: string; value: number }>();

  values.forEach(({ date, value }) => {
    const range = granularity === 'weekly'
      ? getWeekRange(date, startOfWeek)
      : { start: date, end: date };
    const current = totals.get(range.start);
    totals.set(range.start, {
      end: range.end,
      value: (current?.value ?? 0) + value,
    });
  });

  return Array.from(totals.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, total]) => ({
      date,
      value: total.value,
      label: granularity === 'weekly'
        ? formatWeekRangeLabel(date, total.end)
        : formatDailyLabel(date),
    }));
};

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const parseUtcDay = (dateKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp / MILLISECONDS_PER_DAY;
};

export const getTimeAwareEma = (
  values: DatedChartValue[],
  halfLifeDays = 14
): number[] | null => {
  if (
    values.length === 0 ||
    !Number.isFinite(halfLifeDays) ||
    halfLifeDays <= 0 ||
    values.some(point => !Number.isFinite(point.value))
  ) {
    return null;
  }

  const days = values.map(point => parseUtcDay(point.date));
  if (days.some(day => day === null)) return null;

  const result = [Number(values[0].value.toFixed(3))];
  let smoothed = values[0].value;

  for (let index = 1; index < values.length; index += 1) {
    const elapsedDays = (days[index] as number) - (days[index - 1] as number);
    if (elapsedDays <= 0) return null;

    const alpha = 1 - Math.pow(0.5, elapsedDays / halfLifeDays);
    smoothed += alpha * (values[index].value - smoothed);
    result.push(Number(smoothed.toFixed(3)));
  }

  return result;
};
