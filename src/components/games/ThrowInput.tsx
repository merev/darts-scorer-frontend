import { useState } from 'react';
import { Form, Button, InputGroup } from 'react-bootstrap';
import type { GameState } from '../../types/darts';

interface ThrowInputProps {
  game: GameState;
  onSubmit: (payload: { playerId: string; visitScore: number; dartsThrown: number }) => void;
  submitting: boolean;
}

function ThrowInput({ game, onSubmit, submitting }: ThrowInputProps) {
  const [visitScore, setVisitScore] = useState<number | ''>('');
  const [dartsThrown, setDartsThrown] = useState<number>(3);

  const isFinished = game.status === 'finished';

  const currentPlayer = game.players.find((p) => p.id === game.currentPlayerId) ?? game.players[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlayer) return;
    if (visitScore === '' || visitScore < 0 || visitScore > 180) return;
    if (dartsThrown < 1 || dartsThrown > 3) return;

    onSubmit({
      playerId: currentPlayer.id,
      visitScore: Number(visitScore),
      dartsThrown,
    });

    // Reset only visit score; darts count usually stays at 3
    setVisitScore('');
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Group className="mb-2">
        <Form.Label className="fw-semibold">
          Current player
        </Form.Label>
        <div>{currentPlayer ? currentPlayer.name : 'N/A'}</div>
      </Form.Group>

      <Form.Group className="mb-3" controlId="visitScore">
        <Form.Label>Visit score (0–180)</Form.Label>
        <InputGroup>
          <Form.Control
            type="number"
            min={0}
            max={180}
            value={visitScore}
            onChange={(e) => {
              const val = e.target.value;
              setVisitScore(val === '' ? '' : Number(val));
            }}
            disabled={submitting || isFinished}
          />
        </InputGroup>
      </Form.Group>

      <Form.Group className="mb-3" controlId="dartsThrown">
        <Form.Label>Darts thrown (1–3)</Form.Label>
        <Form.Select
          value={dartsThrown}
          onChange={(e) => setDartsThrown(Number(e.target.value))}
          disabled={submitting || isFinished}
        >
          <option value={1}>1 dart</option>
          <option value={2}>2 darts</option>
          <option value={3}>3 darts</option>
        </Form.Select>
      </Form.Group>

      <Button
        type="submit"
        disabled={submitting || isFinished || visitScore === ''}
      >
        {isFinished ? 'Game finished' : submitting ? 'Submitting...' : 'Submit visit'}
      </Button>
    </Form>
  );
}

export default ThrowInput;
