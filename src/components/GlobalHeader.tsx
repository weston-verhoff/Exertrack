// src/components/GlobalHeader.tsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
	const HomeIcon = FaHome as unknown as React.FC<{ size?: number }>;
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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
    <header className="global-header">
			<Link className="logo font-white"  to="/" onClick={() => setMenuOpen(false)}>
				<div style={{ fontStyle: 'italic' }}>EzEx</div>
			</Link>
			<nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
				<Link to="/" onClick={() => setMenuOpen(false)}>
				<HomeIcon size={20} /> Home
				</Link>
			  <Link to="/plan" onClick={() => setMenuOpen(false)}>Plan a Session</Link>
			  <Link to="/past" onClick={() => setMenuOpen(false)}>Workouts</Link>
			  <Link to="/templates" onClick={() => setMenuOpen(false)}>Templates</Link>
			  <Link to="/analytics" onClick={() => setMenuOpen(false)}>Analytics</Link>
				{user ? (
					<button className="sign-out-button" onClick={handleSignOut}>
						Sign Out
					</button>
				) : (
					<Link to="/login" onClick={() => setMenuOpen(false)}>Sign In</Link>
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
