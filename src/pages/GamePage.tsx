import { useParams } from 'react-router-dom';
import { Card, Row, Col } from 'react-bootstrap';

import { useGame, usePostThrow } from '../api/games';
import Scoreboard from '../components/games/Scoreboard';
import ThrowInput from '../components/games/ThrowInput';

function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { data: game, isLoading, isError } = useGame(gameId || '');
  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId || '');

  if (isLoading) return <p>Loading game...</p>;
  if (isError || !game) return <p>Game not found.</p>;

  return (
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
            <Card.Title>Enter Score</Card.Title>
            <ThrowInput
              game={game}
              onSubmit={payload => postThrow(payload)}
              submitting={posting}
            />
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default GamePage;
