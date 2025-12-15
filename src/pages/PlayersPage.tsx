import { useState } from 'react';
import { Card, Form, Button, Row, Col, Table, Alert, Container } from 'react-bootstrap';
import { usePlayers, useCreatePlayer } from '../api/players';

function PlayersPage() {
  const {
    data,
    isLoading,
    isError,
    error
  } = usePlayers();

  const players = Array.isArray(data) ? data : [];
  const hasBadShape =
    !isLoading && !isError && data !== undefined && !Array.isArray(data);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');

  const { mutateAsync: createPlayer, isPending: creating } = useCreatePlayer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createPlayer({ name: name.trim(), nickname: nickname.trim() || undefined });
    setName('');
    setNickname('');
  };

  return (
    <Container>
      <Row className="g-4">
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Add Player</Card.Title>
              {(isError || hasBadShape) && (
                <Alert variant="warning" className="mb-3">
                  Backend is not returning a players list yet.
                  <div className="mt-1 small text-muted">
                    {isError
                      ? (error as any)?.message ?? ''
                      : `Unexpected response type: ${typeof data}`}
                  </div>
                </Alert>
              )}
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
                <Button type="submit" disabled={creating || isError || hasBadShape}>
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

              {isLoading && <p>Loading players...</p>}

              {(isError || hasBadShape) && !isLoading && (
                <Alert variant="danger" className="mb-0">
                  Could not load players from the backend.
                </Alert>
              )}

              {!isLoading && !isError && !hasBadShape && (
                <>
                  {players.length === 0 ? (
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
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default PlayersPage;
