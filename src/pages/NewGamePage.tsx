import { useNavigate } from 'react-router-dom';
import { Alert, Container } from 'react-bootstrap';
import { useState } from 'react';

import { usePlayers } from '../api/players';
import { useCreateGame } from '../api/games';
import GameConfigForm from '../components/games/GameConfigForm';
import type { GameConfig } from '../types/darts';

import '../styles/NewGamePage.css';

const MAX_PLAYERS = 8;

function NewGamePage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string>('');

  const {
    data,
    isLoading: loadingPlayers,
    isError,
    error,
  } = usePlayers();

  const { mutateAsync: createGame, isPending: creating } = useCreateGame();

  const players = Array.isArray(data) ? data : [];
  const hasBadShape =
    !loadingPlayers && !isError && data !== undefined && !Array.isArray(data);

  const handleCreateGame = async (config: GameConfig, playerIds: string[]) => {
    setSubmitError('');

    if (playerIds.length > MAX_PLAYERS) {
      setSubmitError(`Too many players selected (max ${MAX_PLAYERS}).`);
      return;
    }

    const game = await createGame({ config, playerIds });
    navigate(`/game/${game.id}`);
  };

  return (
    <Container className="ng-page">
      <div className="ng-pageTitle">NEW GAME</div>

      {loadingPlayers && <div className="ng-loading">Loading players...</div>}

      {(isError || hasBadShape) && (
        <Alert variant="danger">
          <Alert.Heading>Backend not available</Alert.Heading>
          <p>Could not load the list of players.</p>
          <div className="mb-0 small text-muted">
            {isError
              ? (error as any)?.message ?? ''
              : `Unexpected response type from /players: ${typeof data}`}
          </div>
        </Alert>
      )}

      {submitError ? (
        <Alert variant="warning" className="ng-submitAlert">
          {submitError}
        </Alert>
      ) : null}

      {!loadingPlayers && !isError && !hasBadShape && (
        <GameConfigForm
          players={players}
          onSubmit={handleCreateGame}
          submitting={creating}
        />
      )}
    </Container>
  );
}

export default NewGamePage;
