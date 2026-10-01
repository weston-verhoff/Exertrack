import {
  aggregateChartValues,
  formatWeekRangeLabel,
  getTimeAwareEma,
  getWeekRange,
} from './chartAnalytics';

describe('chart analytics', () => {
  it('builds a 14-day time-aware exponential moving average', () => {
    expect(getTimeAwareEma([
      { date: '2026-09-01', value: 180 },
      { date: '2026-09-15', value: 186 },
      { date: '2026-09-29', value: 186 },
    ])).toEqual([180, 183, 184.5]);
  });

  it('weights observations according to elapsed calendar days', () => {
    expect(getTimeAwareEma([
      { date: '2026-09-01', value: 100 },
      { date: '2026-09-02', value: 114 },
      { date: '2026-09-16', value: 114 },
    ])).toEqual([100, 100.676, 107.338]);
  });

  it('rejects invalid, unordered, and non-finite EMA inputs', () => {
    expect(getTimeAwareEma([])).toBeNull();
    expect(getTimeAwareEma([{ date: 'not-a-date', value: 10 }])).toBeNull();
    expect(getTimeAwareEma([
      { date: '2026-09-02', value: 10 },
      { date: '2026-09-01', value: 20 },
    ])).toBeNull();
    expect(getTimeAwareEma([{ date: '2026-09-01', value: Number.NaN }])).toBeNull();
    expect(getTimeAwareEma([{ date: '2026-09-01', value: 10 }], 0)).toBeNull();
  });

  it('groups dated values into weeks using the configured week start', () => {
    expect(getWeekRange('2026-08-07', 6)).toEqual({
      start: '2026-08-01',
      end: '2026-08-07',
    });
    expect(formatWeekRangeLabel('2026-08-01', '2026-08-07')).toBe('8/1–8/7');

    expect(aggregateChartValues([
      { date: '2026-08-01', value: 2 },
      { date: '2026-08-07', value: 3 },
      { date: '2026-08-08', value: 4 },
    ], 'weekly', 6)).toEqual([
      { date: '2026-08-01', label: '8/1–8/7', value: 5 },
      { date: '2026-08-08', label: '8/8–8/14', value: 4 },
    ]);
  });

  it('combines multiple values recorded on the same day', () => {
    expect(aggregateChartValues([
      { date: '2026-08-01', value: 2 },
      { date: '2026-08-01', value: 3 },
    ], 'daily', 1)).toEqual([
      { date: '2026-08-01', label: 'Aug 1', value: 5 },
    ]);
  });
});
