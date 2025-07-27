// src/components/GlobalHeader.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="global-header">
      <div className="logo">MyApp</div>

			<nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
			  <Link to="/" onClick={() => setMenuOpen(false)}>Dashboard</Link>
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
