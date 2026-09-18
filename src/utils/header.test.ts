import { getGlobalHeaderVariant } from './header';

describe('getGlobalHeaderVariant', () => {
  it.each(['/plan', '/plan/', '/templates/workout-123/edit'])(
    'uses the secondary header on %s',
    (pathname) => {
      expect(getGlobalHeaderVariant(pathname)).toBe('secondary');
    }
  );

  it.each(['/', '/templates', '/past', '/plan/extra'])(
    'uses the default header on %s',
    (pathname) => {
      expect(getGlobalHeaderVariant(pathname)).toBe('default');
    }
  );
});
