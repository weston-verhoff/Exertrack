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

export const getRollingAverage = (
  values: number[],
  windowSize = 5
): Array<number | null> | null => {
  if (
    windowSize < 1 ||
    values.length < windowSize ||
    values.some(value => !Number.isFinite(value))
  ) {
    return null;
  }

  return values.map((_, index) => {
    if (index < windowSize - 1) return null;
    const window = values.slice(index - windowSize + 1, index + 1);
    return Number(
      (window.reduce((sum, value) => sum + value, 0) / windowSize).toFixed(3)
    );
  });
};
