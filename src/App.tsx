import Container from 'react-bootstrap/Container'; // still used in footer
import { Routes, Route } from 'react-router-dom';

import AppNavbar from './components/layout/AppNavbar';
import HomePage from './pages/HomePage';
import NewGamePage from './pages/NewGamePage';
import GamePage from './pages/GamePage';
import PlayersPage from './pages/PlayersPage';
import StatsPage from './pages/StatsPage';
import AppFooter from './components/layout/AppFooter';

import './App.css';

function App() {
  return (
    <div className="app-root">
      <AppNavbar />

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
