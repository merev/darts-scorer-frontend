import { useState } from 'react';
import { Card, Form, Button, Row, Col, Table } from 'react-bootstrap';
import { usePlayers, useCreatePlayer } from '../api/players';

function PlayersPage() {
  const { data: players = [], isLoading } = usePlayers();
  const { mutateAsync: createPlayer, isPending: creating } = useCreatePlayer();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlayer({ name: name.trim(), nickname: nickname.trim() || undefined });
    setName('');
    setNickname('');
  };

  return (
    <Row className="g-4">
      <Col md={4}>
        <Card>
          <Card.Body>
            <Card.Title>Add Player</Card.Title>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="name">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="nickname">
                <Form.Label>Nickname (optional)</Form.Label>
                <Form.Control
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                />
              </Form.Group>
              <Button type="submit" disabled={creating}>
                {creating ? 'Adding...' : 'Add'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Col>
      <Col md={8}>
        <Card>
          <Card.Body>
            <Card.Title>Players</Card.Title>
            {isLoading ? (
              <p>Loading players...</p>
            ) : players.length === 0 ? (
              <p>No players yet. Add some on the left.</p>
            ) : (
              <Table striped bordered hover responsive size="sm">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Nickname</th>
                    <th>Matches</th>
                    <th>Wins</th>
                    <th>Avg.</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.nickname || '-'}</td>
                      <td>{p.stats?.matchesPlayed ?? '-'}</td>
                      <td>{p.stats?.matchesWon ?? '-'}</td>
                      <td>{p.stats?.averageScore?.toFixed?.(2) ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export default PlayersPage;
