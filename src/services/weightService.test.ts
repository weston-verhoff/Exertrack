import { supabase } from '../supabase/client';
import { fetchWeightEntries, updateWeightEntry } from './weightService';

jest.mock('../supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

describe('weightService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('scopes reads to the owner and uses deterministic timeline ordering', async () => {
    const query: any = {};
    query.select = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.order = jest
      .fn()
      .mockReturnValueOnce(query)
      .mockReturnValueOnce(query)
      .mockResolvedValueOnce({ data: [], error: null });
    (supabase.from as jest.Mock).mockReturnValue(query);

    await fetchWeightEntries({ userId: 'user-1' });

    expect(supabase.from).toHaveBeenCalledWith('weight_entries');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.order.mock.calls).toEqual([
      ['weighed_on', { ascending: true }],
      ['created_at', { ascending: true }],
      ['id', { ascending: true }],
    ]);
  });

  it('updates only editable values and applies id and owner filters', async () => {
    const row = {
      id: 'entry-1',
      user_id: 'user-1',
      weight_kg: 80,
      weighed_on: '2026-09-20',
      created_at: '2026-09-20T08:00:00Z',
    };
    const query: any = {};
    query.update = jest.fn(() => query);
    query.eq = jest.fn(() => query);
    query.select = jest.fn(() => query);
    query.single = jest.fn().mockResolvedValue({ data: row, error: null });
    (supabase.from as jest.Mock).mockReturnValue(query);

    await updateWeightEntry({
      id: 'entry-1',
      userId: 'user-1',
      weightKg: 80,
      weighedOn: '2026-09-20',
    });

    expect(query.update).toHaveBeenCalledWith({
      weight_kg: 80,
      weighed_on: '2026-09-20',
    });
    expect(query.eq.mock.calls).toEqual([
      ['id', 'entry-1'],
      ['user_id', 'user-1'],
    ]);
  });
});
