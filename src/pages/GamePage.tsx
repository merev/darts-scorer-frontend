import { useParams } from 'react-router-dom';
import { Card, Row, Col, Container, Alert, Spinner, Button } from 'react-bootstrap';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import Scoreboard from '../components/games/Scoreboard';
import ThrowInput from '../components/games/ThrowInput';

function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();

  const {
    data: game,
    isLoading,
    isError,
    error
  } = useGame(gameId || '');

  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId || '');

  const handleSubmitThrow = (payload: {
    playerId: string;
    visitScore: number;
    dartsThrown: number;
  }) => {
    postThrow(payload);
  };

  const { mutate: undoThrow, isPending: undoing } = useUndoThrow(gameId || '');

  return (
    <Container>
      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" role="status" />
        </div>
      )}

      {isError && (
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>Could not load game</Alert.Heading>
          <p>
            The game could not be loaded from the backend. This is expected while the API
            is not running or the endpoint is not implemented.
          </p>
          <div className="small text-muted">
            {(error as any)?.message ?? 'Check the API container or network config.'}
          </div>
        </Alert>
      )}

      {!isLoading && !isError && !game && (
        <Alert variant="warning" className="mt-3">
          Game not found.
        </Alert>
      )}

      {!isLoading && !isError && game && (
        <Row className="g-4">
          <Col lg={8}>
            <Card>
              <Card.Body>
                <Card.Title>
                  Game #{game.id} – {game.config.mode}
                </Card.Title>
                <Scoreboard game={game} />
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card>
            <Card.Body>
                <Card.Title>Enter score</Card.Title>

                <ThrowInput
                game={game}
                onSubmit={payload => postThrow(payload)}
                submitting={posting}
                />

                <div className="d-flex justify-content-end mt-3">
                <Button
                    variant="outline-danger"
                    disabled={undoing || posting || game.history.length === 0}
                    onClick={() => undoThrow()}
                >
                    {undoing ? 'Undoing...' : 'Undo Last Throw'}
                </Button>
                </div>
            </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default GamePage;
