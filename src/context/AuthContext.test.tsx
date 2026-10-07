import { act, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

let mockListener: (event: string, session: unknown) => void;
const mockSession = { user: { id: 'owner', email: 'westonverhoff@gmail.com', user_metadata: { theme: 'fall' } } };
jest.mock('../supabase/client', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: mockSession }, error: null }),
  onAuthStateChange: (listener: typeof mockListener) => { mockListener = listener; return { data: { subscription: { unsubscribe: jest.fn() } } }; },
} } }));

function Status() { const { user, loading } = useAuth(); return <div>{loading ? 'Loading' : user?.email}</div>; }

test('iframe auth still resolves and refreshes without writing preview theme or saved preference', async () => {
  document.documentElement.dataset.theme = 'neon';
  localStorage.setItem('iwyn-theme', 'dark');
  render(<AuthProvider syncTheme={false}><Status /></AuthProvider>);
  expect(await screen.findByText('westonverhoff@gmail.com')).toBeInTheDocument();
  act(() => mockListener('SIGNED_IN', { ...mockSession, user: { ...mockSession.user } }));
  expect(document.documentElement.dataset.theme).toBe('neon');
  expect(localStorage.getItem('iwyn-theme')).toBe('dark');
});

test('normal app auth continues to apply the account theme', async () => {
  render(<AuthProvider><Status /></AuthProvider>);
  await screen.findByText('westonverhoff@gmail.com');
  expect(document.documentElement.dataset.theme).toBe('fall');
});
