import { useNavigate } from 'react-router-dom';
import { Card } from 'react-bootstrap';

import { usePlayers } from '../api/players';
import { useCreateGame } from '../api/games';
import GameConfigForm from '../components/games/GameConfigForm';
import type { GameConfig } from '../types/darts';

function NewGamePage() {
  const navigate = useNavigate();
  const { data: players = [], isLoading: loadingPlayers } = usePlayers();
  const { mutateAsync: createGame, isPending: creating } = useCreateGame();

  const handleCreateGame = async (config: GameConfig, playerIds: string[]) => {
    const game = await createGame({ config, playerIds });
    navigate(`/game/${game.id}`);
  };

  return (
    <Card>
      <Card.Body>
        <Card.Title>New Game</Card.Title>
        {loadingPlayers ? (
          <p>Loading players...</p>
        ) : (
          <GameConfigForm
            players={players}
            onSubmit={handleCreateGame}
            submitting={creating}
          />
        )}
      </Card.Body>
    </Card>
  );
}

export default NewGamePage;
