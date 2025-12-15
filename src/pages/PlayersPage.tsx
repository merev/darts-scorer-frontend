import { useState } from 'react';
import {
  Card,
  Form,
  Button,
  Row,
  Col,
  Table,
  Alert,
  Container,
} from 'react-bootstrap';
import { usePlayers, useCreatePlayer } from '../api/players';

function PlayersPage() {
  const { data, isLoading, isError, error } = usePlayers();

  // If data isn't an array (null, object, etc.), just treat it as empty list
  const players = Array.isArray(data) ? data : [];

  const [name, setName] = useState('');

  const { mutateAsync: createPlayer, isPending: creating } = useCreatePlayer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    await createPlayer({ name: trimmed });
    setName('');
  };

  return (
    <Container>
      <Row className="g-4">
        {/* Left: create player */}
        <Col md={4}>
          <Card>
            <Card.Body>
              <Card.Title>Add Player</Card.Title>

              {isError && (
                <Alert variant="warning" className="mb-3">
                  Could not load players from the backend.
                  <div className="mt-1 small text-muted">
                    {(error as any)?.message ?? ''}
                  </div>
                </Alert>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="name">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </Form.Group>

                <Button type="submit" disabled={creating || isError}>
                  {creating ? 'Adding...' : 'Add'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Right: list players */}
        <Col md={8}>
          <Card>
            <Card.Body>
              <Card.Title>Players</Card.Title>

              {isLoading && <p>Loading players...</p>}

              {isError && !isLoading && (
                <Alert variant="danger" className="mb-0">
                  Could not load players from the backend.
                </Alert>
              )}

              {!isLoading && !isError && (
                <>
                  {players.length === 0 ? (
                    <p>No players yet. Add some on the left.</p>
                  ) : (
                    <Table striped bordered hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Matches</th>
                          <th>Wins</th>
                          <th>Avg.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {players.map((p) => (
                          <tr key={p.id}>
                            <td>{p.name}</td>
                            <td>{p.stats?.matchesPlayed ?? '-'}</td>
                            <td>{p.stats?.matchesWon ?? '-'}</td>
                            <td>
                              {p.stats?.averageScore != null
                                ? p.stats.averageScore.toFixed(2)
                                : '-'}
                            </td>
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
