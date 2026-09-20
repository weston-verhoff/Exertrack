import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Login from './login';

const mockNavigate = jest.fn();
const mockSignIn = jest.fn();
const mockSignUp = jest.fn();
let mockLocationState: unknown = null;

jest.mock('react-router-dom', () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useLocation: () => ({ state: mockLocationState }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    loading: false,
    signIn: mockSignIn,
    signUp: mockSignUp,
  }),
}));

describe('Login', () => {
  beforeEach(() => {
    mockLocationState = null;
    mockNavigate.mockReset();
    mockSignIn.mockReset();
    mockSignUp.mockReset();
  });

  it('shows the full brand above the shared sign-in and sign-up form', () => {
    const { container } = render(<Login />);
    const logo = screen.getByRole('img', { name: 'IWYN Fitness' });
    const form = container.querySelector('form');

    expect(logo).toHaveClass('auth-logo');
    expect(form).not.toBeNull();
    expect(logo.compareDocumentPosition(form as HTMLFormElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('preserves an intentional protected deep link after sign-in', async () => {
    mockLocationState = {
      from: { pathname: '/plan', search: '?date=2026-09-21' },
    };
    mockSignIn.mockResolvedValue(undefined);

    render(<Login />);
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'athlete@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/plan?date=2026-09-21', {
        replace: true,
      });
    });
  });
});
