import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';

import AppNavbar from './components/layout/AppNavbar';
import HomePage from './pages/HomePage';
import NewGamePage from './pages/NewGamePage';
import GamePage from './pages/GamePage';
import PlayersPage from './pages/PlayersPage';
import StatsPage from './pages/StatsPage';
import AppFooter from './components/layout/AppFooter';

import './App.css';

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Optional: keep body class too (useful for global things like modals)
  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <div className={`app-root theme-${theme}`}>
      <AppNavbar
        theme={theme}
        onToggleTheme={() =>
          setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
        }
      />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new-game" element={<NewGamePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>

      <AppFooter />
    </div>
  );
}

export default App;
