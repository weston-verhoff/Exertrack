import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { GlobalHeader } from './GlobalHeader';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: PropsWithChildren<{ to: string }>) => (
    <a href={to} {...props}>{children}</a>
  ),
  useNavigate: () => jest.fn(),
}), { virtual: true });

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, signOut: jest.fn() }),
}));

describe('GlobalHeader', () => {
  it('has no modifier class for the default variant', () => {
    render(<GlobalHeader />);

    expect(screen.getByRole('banner')).toHaveClass('global-header');
    expect(screen.getByRole('banner')).not.toHaveClass('global-header--secondary');
  });

  it('exposes semantic secondary intent and both theme-controlled logos', () => {
    render(<GlobalHeader variant="secondary" />);

    expect(screen.getByRole('banner')).toHaveClass('global-header--secondary');

    const logo = screen.getByRole('link', { name: 'IWYN home' });
    expect(logo.querySelector('.logo-image--light')).toBeInTheDocument();
    expect(logo.querySelector('.logo-image--dark')).toBeInTheDocument();
  });
});
