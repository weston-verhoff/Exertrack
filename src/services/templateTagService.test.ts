import { normalizeTemplateTagName } from './templateTagService';

jest.mock('../supabase/client', () => ({ supabase: {} }));

describe('normalizeTemplateTagName', () => {
  it.each([
    ['pUsH', 'Push'],
    [' PuSh ', 'Push'],
    ['UPPER BODY', 'Upper body'],
    ['', ''],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeTemplateTagName(input)).toBe(expected);
  });
});
