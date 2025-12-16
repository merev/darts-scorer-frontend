import { useParams } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  Card,
  Alert,
  Spinner,
  Button,
} from 'react-bootstrap';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import GameScoreboard from '../components/games/GameScoreboard';
import ThrowInput from '../components/games/ThrowInput';

function GamePage() {
  const { id } = useParams<{ id: string }>();
  const gameId = id ?? '';

  const {
    data: game,
    isLoading,
    isError,
    error,
  } = useGame(gameId);

  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId);
  const { mutate: undoThrow, isPending: undoing } = useUndoThrow(gameId);

  if (!gameId) {
    return (
      <Container className="py-4">
        <Alert variant="danger">No game id in URL.</Alert>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" role="status" className="mb-2" />
        <div>Loading game...</div>
      </Container>
    );
  }

  if (isError || !game) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Could not load game</Alert.Heading>
          <div className="mb-0 small text-muted">
            {(error as any)?.message ?? 'Unknown error'}
          </div>
        </Alert>
      </Container>
    );
  }

  const isFinished = game.status === 'finished';

  return (
    <Container className="py-3">
      <Row className="mb-3">
        <Col>
          <h2 className="mb-1">Game</h2>
          <div className="text-muted small">
            Mode: {game.config.mode}
            {game.config.mode === 'X01' && game.config.startingScore
              ? ` (${game.config.startingScore})`
              : ''}
            {' • '}
            Status: {game.status}
          </div>
        </Col>
      </Row>

      {isFinished && (
        <Row className="mb-3">
          <Col>
            <Alert variant="success" className="mb-0">
              Game finished.
              {/* You could compute and show the winner’s name here by checking scores.remaining === 0 */}
            </Alert>
          </Col>
        </Row>
      )}

      <Row className="g-4">
        {/* Left: scoreboard */}
        <Col md={7}>
          <GameScoreboard game={game} />
        </Col>

        {/* Right: throw input + undo */}
        <Col md={5}>
          <Card>
            <Card.Body>
              <Card.Title>Enter score</Card.Title>

              <ThrowInput
                game={game}
                onSubmit={(payload) => postThrow(payload)}
                submitting={posting}
              />

              <div className="d-flex justify-content-end mt-3">
                <Button
                  variant="outline-danger"
                  size="sm"
                  disabled={
                    undoing ||
                    posting ||
                    game.history.length === 0
                  }
                  onClick={() => undoThrow()}
                >
                  {undoing ? 'Undoing...' : 'Undo Last Throw'}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default GamePage;
