import { useState } from 'react';
import { Form, Button, Row, Col, InputGroup } from 'react-bootstrap';
import type { GameConfig, GameMode, Player } from '../../types/darts';

export interface GameConfigFormProps {
  players: Player[];
  onSubmit: (config: GameConfig, selectedPlayerIds: string[]) => void;
  submitting?: boolean;
}

const DEFAULT_X01_SCORE = 501;

function GameConfigForm({ players, onSubmit, submitting }: GameConfigFormProps) {
  const [mode, setMode] = useState<GameMode>('X01');
  const [startingScore, setStartingScore] = useState<number>(DEFAULT_X01_SCORE);
  const [legs, setLegs] = useState<number>(3);
  const [sets, setSets] = useState<number>(1);
  const [doubleOut, setDoubleOut] = useState<boolean>(true);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config: GameConfig = {
      mode,
      legs,
      sets,
      doubleOut,
      startingScore: mode === 'X01' ? startingScore : undefined
    };

    onSubmit(config, selectedPlayerIds);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group controlId="mode">
            <Form.Label>Game Mode</Form.Label>
            <Form.Select
              value={mode}
              onChange={e => setMode(e.target.value as GameMode)}
            >
              <option value="X01">X01 (301 / 501 / 701 ...)</option>
              <option value="Cricket">Cricket</option>
              <option value="AroundTheWorld">Around the World</option>
            </Form.Select>
          </Form.Group>
        </Col>
        {mode === 'X01' && (
          <Col md={6}>
            <Form.Group controlId="startingScore">
              <Form.Label>Starting Score</Form.Label>
              <Form.Control
                type="number"
                min={101}
                step={1}
                value={startingScore}
                onChange={e => setStartingScore(Number(e.target.value))}
              />
            </Form.Group>
          </Col>
        )}
      </Row>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="legs">
            <Form.Label>Legs</Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={legs}
              onChange={e => setLegs(Number(e.target.value))}
            />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group controlId="sets">
            <Form.Label>Sets</Form.Label>
            <Form.Control
              type="number"
              min={1}
              value={sets}
              onChange={e => setSets(Number(e.target.value))}
            />
          </Form.Group>
        </Col>
        {mode === 'X01' && (
          <Col md={4}>
            <Form.Group controlId="doubleOut" className="mt-4">
              <Form.Check
                type="switch"
                label="Double Out"
                checked={doubleOut}
                onChange={e => setDoubleOut(e.target.checked)}
              />
            </Form.Group>
          </Col>
        )}
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>Select Players</Form.Label>
        <Row xs={1} md={2}>
          {players.map(player => (
            <Col key={player.id}>
              <Form.Check
                type="checkbox"
                id={`player-${player.id}`}
                label={player.nickname ? `${player.name} (${player.nickname})` : player.name}
                checked={selectedPlayerIds.includes(player.id)}
                onChange={() => handleTogglePlayer(player.id)}
              />
            </Col>
          ))}
        </Row>
      </Form.Group>

      <InputGroup className="mb-3">
        <Button type="submit" disabled={submitting || selectedPlayerIds.length < 2}>
          {submitting ? 'Creating...' : 'Start Game'}
        </Button>
      </InputGroup>
    </Form>
  );
}

export default GameConfigForm;
