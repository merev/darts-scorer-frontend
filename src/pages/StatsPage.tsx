import { Link } from 'react-router-dom';
import { Container, Card, Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { useGames } from '../api/games';
import type { Game } from '../types/darts';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(); // you can tweak format later
}

function renderPlayers(game: Game) {
  if (!game.players || game.players.length === 0) return '-';
  return game.players.map((p) => p.name).join(', ');
}

function StatsPage() {
  const { data: games, isLoading, isError, error } = useGames();

  return (
    <Container>
      <Card>
        <Card.Body>
          <Card.Title>Game History</Card.Title>
          <Card.Text className="text-muted">
            Recent games you&apos;ve played. Click a row to reopen a game.
          </Card.Text>

          {isLoading && (
            <div className="text-center py-3">
              <Spinner animation="border" role="status" className="mb-2" />
              <div>Loading games...</div>
            </div>
          )}

          {isError && (
            <Alert variant="danger">
              <Alert.Heading>Could not load games</Alert.Heading>
              <div className="mb-0 small text-muted">
                {(error as any)?.message ?? 'Unknown error'}
              </div>
            </Alert>
          )}

          {!isLoading && !isError && (!games || games.length === 0) && (
            <p className="mb-0">No games yet. Start a new one!</p>
          )}

          {!isLoading && !isError && games && games.length > 0 && (
            <Table hover responsive size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Mode</th>
                  <th>Players</th>
                  <th>Status</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {games.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link to={`/game/${g.id}`} className="text-decoration-none">
                        {formatDate(g.createdAt)}
                      </Link>
                    </td>
                    <td>
                      {g.config.mode}
                      {g.config.mode === 'X01' && g.config.startingScore
                        ? ` (${g.config.startingScore})`
                        : ''}
                    </td>
                    <td>{renderPlayers(g)}</td>
                    <td>
                      {g.status === 'finished' && (
                        <Badge bg="success" pill>
                          Finished
                        </Badge>
                      )}
                      {g.status === 'in_progress' && (
                        <Badge bg="warning" text="dark" pill>
                          In progress
                        </Badge>
                      )}
                      {g.status === 'pending' && (
                        <Badge bg="secondary" pill>
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td>
                    {g.winnerId
                        ? g.players.find(p => p.id === g.winnerId)?.name || 'Unknown'
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
}

export default StatsPage;
