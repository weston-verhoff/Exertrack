// src/components/GlobalHeader.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';

export function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
	const HomeIcon = FaHome as unknown as React.FC<{ size?: number }>;


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
			  <Link to="/past" onClick={() => setMenuOpen(false)}>Past Workouts</Link>
			  <Link to="/templates" onClick={() => setMenuOpen(false)}>Templates</Link>
			  <Link to="/analytics" onClick={() => setMenuOpen(false)}>Analytics</Link>
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
