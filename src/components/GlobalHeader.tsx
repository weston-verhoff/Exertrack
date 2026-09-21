// src/components/GlobalHeader.tsx
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type GlobalHeaderVariant = 'default' | 'secondary';

type GlobalHeaderProps = {
  variant?: GlobalHeaderVariant;
};

export function GlobalHeader({ variant = 'default' }: GlobalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
	const location = useLocation();
	const loggedInLinks: Array<{ to: string; label: ReactNode }> = [
    {
      to: '/',
      label: (
        <>
          <Home aria-hidden="true" size={20} /> Home
        </>
      ),
    },
    { to: '/plan', label: 'Plan a Session' },
    { to: '/past', label: 'Workouts' },
    { to: '/templates', label: 'Templates' },
    { to: '/account', label: 'Account' },
  ];
  const loggedOutLinks: Array<{ to: string; label: ReactNode }> = [];

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncHeaderHeight = () => {
      const height = header.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty(
          '--global-header-height',
          `${height}px`
        );
      }
    };

    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(syncHeaderHeight);
    resizeObserver?.observe(header);

    return () => {
      window.removeEventListener('resize', syncHeaderHeight);
      resizeObserver?.disconnect();
    };
  }, []);

  const handleSignOut = async () => {
    const returnPath = `${location.pathname}${location.search}${location.hash}`;
    navigate('/login', { replace: true, state: null });

    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out', error);
      navigate(returnPath, { replace: true });
    } finally {
      setMenuOpen(false);
    }
  };

  return (
    <header
      ref={headerRef}
      className={`global-header${variant === 'secondary' ? ' global-header--secondary' : ''}`}
    >
			<Link
        aria-label="IWYN home"
        className="logo font-white"
        to="/"
        onClick={() => setMenuOpen(false)}
      >
				<span className="logo-image" aria-hidden="true" />
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
        <Menu aria-hidden="true" size={24} />
      </button>

      {menuOpen && <div className="overlay" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
