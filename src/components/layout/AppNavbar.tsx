import { useEffect, useRef, useState } from 'react';
import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink, useLocation } from 'react-router-dom';
import { FiMoon, FiSun } from 'react-icons/fi';

interface AppNavbarProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

function AppNavbar({ theme, onToggleTheme }: AppNavbarProps) {
  const [expanded, setExpanded] = useState(false);
  const navbarRef = useRef<HTMLElement | null>(null);
  const location = useLocation();

  // Close menu on route change
  useEffect(() => {
    setExpanded(false);
  }, [location.pathname]);

  // Close menu on outside click (only when expanded)
  useEffect(() => {
    if (!expanded) return;

    const onPointerDown = (e: PointerEvent) => {
      const root = navbarRef.current;
      if (!root) return;

      const target = e.target as Node | null;
      if (target && !root.contains(target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expanded]);

  const closeAndBlurToggle = () => {
    setExpanded(false);

    const active = document.activeElement as HTMLElement | null;
    if (active && active.classList.contains('navbar-toggler')) {
      active.blur();
    }
  };

  return (
    <Navbar
      ref={(node) => {
        navbarRef.current = node as unknown as HTMLElement | null;
      }}
      bg="dark"
      variant="dark"
      expand="sm"
      expanded={expanded}
      onToggle={(nextExpanded) => setExpanded(!!nextExpanded)}
      className="app-navbar app-topbar"
    >
      {/* IMPORTANT: this class is used by CSS to keep actions on the top row and
          render the collapse as a full-width second row on mobile */}
      <Container className="app-navbar__container">
        <Navbar.Brand as={NavLink} to="/" end onClick={closeAndBlurToggle}>
          Darts Scorer
        </Navbar.Brand>

        {/* Right side actions (always top-right) */}
        <div className="navbar-actions">
          <button
            type="button"
            className="theme-toggle-btn"
            aria-label="Toggle theme"
            onClick={(e) => {
              onToggleTheme();
              (e.currentTarget as HTMLButtonElement).blur();
            }}
          >
            {theme === 'dark' ? <FiSun /> : <FiMoon />}
          </button>

          <Navbar.Toggle
            aria-controls="main-nav"
            onClick={(e) => {
              (e.currentTarget as HTMLButtonElement).blur();
            }}
          />
        </div>

        {/* Collapsible nav (opens under the header row on mobile; animated) */}
        <Navbar.Collapse id="main-nav" className="app-topbar__collapse">
          <Nav className="app-topbar__nav">
            <Nav.Link as={NavLink} to="/new-game" onClick={closeAndBlurToggle}>
              New Game
            </Nav.Link>

            <Nav.Link as={NavLink} to="/players" onClick={closeAndBlurToggle}>
              Players
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default AppNavbar;
