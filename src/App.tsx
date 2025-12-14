import Container from 'react-bootstrap/Container';
import { Routes, Route } from 'react-router-dom';

import AppNavbar from './components/layout/AppNavbar';
import HomePage from './pages/HomePage';
import NewGamePage from './pages/NewGamePage';
import GamePage from './pages/GamePage';
import PlayersPage from './pages/PlayersPage';
import StatsPage from './pages/StatsPage';

function App() {
  return (
    <>
      <AppNavbar />
      <Container className="my-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/new-game" element={<NewGamePage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
