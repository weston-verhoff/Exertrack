import {
  aggregateChartValues,
  formatWeekRangeLabel,
  getRollingAverage,
  getWeekRange,
} from './chartAnalytics';

describe('chart analytics', () => {
  it('builds a five-point trailing rolling average', () => {
    expect(getRollingAverage([10, 20, 30, 40])).toBeNull();
    expect(getRollingAverage([10, 20, 30, 40, 50])).toEqual([
      null, null, null, null, 30,
    ]);
    expect(getRollingAverage([10, 20, 30, 40, 50, 70])).toEqual([
      null, null, null, null, 30, 42,
    ]);
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
