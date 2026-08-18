// src/components/GlobalHeader.tsx
import { useState, type FC, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import logoLight from '../IWYN_logo_light.png';
import logoDark from '../IWYN_logo_dark.png';

export type GlobalHeaderVariant = 'blue' | 'orange';

type GlobalHeaderProps = {
  variant?: GlobalHeaderVariant;
};

export function GlobalHeader({ variant = 'blue' }: GlobalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
	const HomeIcon = FaHome as unknown as FC<{ size?: number }>;
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
	const loggedInLinks: Array<{ to: string; label: ReactNode }> = [
    {
      to: '/',
      label: (
        <>
          <HomeIcon size={20} /> Home
        </>
      ),
    },
    { to: '/plan', label: 'Plan a Session' },
    { to: '/past', label: 'Workouts' },
    { to: '/templates', label: 'Templates' },
    { to: '/analytics', label: 'Analytics' },
  ];
  const loggedOutLinks: Array<{ to: string; label: ReactNode }> = [];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out', error);
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <header className={`global-header global-header--${variant}`}>
			<Link className="logo font-white"  to="/" onClick={() => setMenuOpen(false)}>
				<img
          src={variant === 'orange' ? logoDark : logoLight}
          alt="IWYN"
          className="logo-image"
        />
			</Link>
			<nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
				{(user ? loggedInLinks : loggedOutLinks).map((link) => (
          <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
            {link.label}
          </Link>
        ))}
				{user ? (
					<button className="sign-out-button" onClick={handleSignOut}>
						Sign Out
					</button>
				) : (
					<></>
				)}
			</nav>


      <button
        className="hamburger"
        onClick={() => setMenuOpen((prev: boolean) => !prev)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
