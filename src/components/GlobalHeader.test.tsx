import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { GlobalHeader } from './GlobalHeader';

const mockNavigate = jest.fn();
const mockSignOut = jest.fn();
let mockUser: { id: string } | null = null;

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>{children}</a>
  ),
  useLocation: () => ({ hash: '', pathname: '/plan', search: '' }),
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, signOut: mockSignOut }),
}));

describe('GlobalHeader', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockSignOut.mockReset();
    mockUser = null;
    document.documentElement.style.removeProperty('--global-header-height');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('has no modifier class for the default variant', () => {
    render(<GlobalHeader />);

    expect(screen.getByRole('banner')).toHaveClass('global-header');
    expect(screen.getByRole('banner')).not.toHaveClass('global-header--secondary');
  });

  it('publishes its rendered height for fixed-page offsets', () => {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 57.5,
    } as DOMRect);

    render(<GlobalHeader />);

    expect(document.documentElement).toHaveStyle(
      '--global-header-height: 57.5px'
    );
  });

  it('exposes semantic secondary intent and one theme-controlled logo', () => {
    render(<GlobalHeader variant="secondary" />);

    expect(screen.getByRole('banner')).toHaveClass('global-header--secondary');

    const logo = screen.getByRole('link', { name: 'IWYN home' });
    const logoImage = logo.querySelector('.logo-image');
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute('aria-hidden', 'true');
    expect(logo.querySelectorAll('.logo-image')).toHaveLength(1);
  });

  it('clears the protected return route before signing out', async () => {
    mockUser = { id: 'user-1' };
    mockSignOut.mockImplementation(async () => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: null,
      });
    });

    render(<GlobalHeader variant="secondary" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalledTimes(1));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });

  it('returns to the originating page when sign-out fails', async () => {
    mockUser = { id: 'user-1' };
    mockSignOut.mockRejectedValue(new Error('Unable to sign out'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<GlobalHeader variant="secondary" />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenLastCalledWith('/plan', { replace: true });
    });
  });
});
