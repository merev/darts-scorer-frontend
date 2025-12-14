import { useState } from 'react';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';
import type { GameState } from '../../types/darts';

interface ThrowInputProps {
  game: GameState;
  onSubmit: (payload: { playerId: string; visitScore: number; dartsThrown: number }) => void;
  submitting?: boolean;
}

function ThrowInput({ game, onSubmit, submitting }: ThrowInputProps) {
  const [visitScore, setVisitScore] = useState<number>(0);
  const [dartsThrown, setDartsThrown] = useState<number>(3);

  const currentPlayer = game.players.find(p => p.id === game.currentPlayerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      playerId: game.currentPlayerId,
      visitScore,
      dartsThrown
    });
    setVisitScore(0);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="align-items-end">
        <Col xs={12}>
          <Form.Label>Current Player</Form.Label>
          <p className="fw-bold">{currentPlayer?.name}</p>
        </Col>
        <Col md={6}>
          <Form.Group controlId="visitScore">
            <Form.Label>Visit Score</Form.Label>
            <Form.Control
              type="number"
              min={0}
              max={180}
              value={visitScore}
              onChange={e => setVisitScore(Number(e.target.value))}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group controlId="dartsThrown">
            <Form.Label>Darts</Form.Label>
            <Form.Select
              value={dartsThrown}
              onChange={e => setDartsThrown(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3} className="mt-3 mt-md-0">
          <InputGroup>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Add Visit'}
            </Button>
          </InputGroup>
        </Col>
      </Row>
    </Form>
  );
}

export default ThrowInput;
