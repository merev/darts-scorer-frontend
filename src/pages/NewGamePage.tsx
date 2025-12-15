import { useNavigate } from 'react-router-dom';
import { Card, Alert, Container } from 'react-bootstrap';

import { usePlayers } from '../api/players';
import { useCreateGame } from '../api/games';
import GameConfigForm from '../components/games/GameConfigForm';
import type { GameConfig } from '../types/darts';

function NewGamePage() {
  const navigate = useNavigate();
  const {
    data,
    isLoading: loadingPlayers,
    isError,
    error
  } = usePlayers();
  const { mutateAsync: createGame, isPending: creating } = useCreateGame();

  const players = Array.isArray(data) ? data : [];
  const hasBadShape =
    !loadingPlayers && !isError && data !== undefined && !Array.isArray(data);

  const handleCreateGame = async (config: GameConfig, playerIds: string[]) => {
    const game = await createGame({ config, playerIds });
    navigate(`/game/${game.id}`);
  };

  return (
    <Container>
      <Card>
        <Card.Body>
          <Card.Title>New Game</Card.Title>

          {loadingPlayers && <p>Loading players...</p>}

          {(isError || hasBadShape) && (
            <Alert variant="danger">
              <Alert.Heading>Backend not available</Alert.Heading>
              <p>
                Could not load the list of players. This is expected while the Go backend
                isn&apos;t running or /players is not implemented yet.
              </p>
              <div className="mb-0 small text-muted">
                {isError
                  ? (error as any)?.message ?? ''
                  : `Unexpected response type from /players: ${typeof data}`}
              </div>
            </Alert>
          )}

          {!loadingPlayers && !isError && !hasBadShape && (
            <GameConfigForm
              players={players}
              onSubmit={handleCreateGame}
              submitting={creating}
            />
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default NewGamePage;
