import { render, screen } from '@testing-library/react';
import { ThemeSandboxRoute } from './ThemeSandboxRoute';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-router-dom', () => ({ Navigate: ({ to }: { to: string }) => <div>Redirect to {to}</div> }), { virtual: true });
const auth = useAuth as jest.Mock;

function preview() {
  render(<ThemeSandboxRoute><div>Private preview</div></ThemeSandboxRoute>);
}

test('admits the owner account', () => {
  auth.mockReturnValue({ user: { email: 'WestonVerhoff@gmail.com' }, loading: false });
  preview();
  expect(screen.getByText('Private preview')).toBeInTheDocument();
});

test.each([null, { email: 'someone@example.com' }, { email: 'westonverhoff@gmail.com.attacker.example' }])('denies other accounts even on a direct URL: %p', user => {
  auth.mockReturnValue({ user, loading: false });
  preview();
  expect(screen.queryByText('Private preview')).not.toBeInTheDocument();
  expect(screen.getByText('Redirect to /')).toBeInTheDocument();
});

test('does not show the preview before authentication resolves', () => {
  auth.mockReturnValue({ user: { email: 'westonverhoff@gmail.com' }, loading: true });
  preview();
  expect(screen.queryByText('Private preview')).not.toBeInTheDocument();
});
