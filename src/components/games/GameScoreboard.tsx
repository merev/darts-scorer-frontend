import { Card, Table, Badge } from 'react-bootstrap';
import type { GameState, PlayerScore } from '../../types/darts';

interface Props {
  game: GameState;
}

function GameScoreboard({ game }: Props) {
  const { players, scores, currentPlayerId, status } = game;

  const scoreByPlayerId = new Map<string, PlayerScore>();
  for (const s of scores) {
    scoreByPlayerId.set(s.playerId, s);
  }

  const isFinished = status === 'finished';

  return (
    <Card>
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-center">
          <span>Scoreboard</span>
          <small className="text-muted">
            Mode: {game.config.mode}{' '}
            {game.config.mode === 'X01' && game.config.startingScore
              ? `(${game.config.startingScore})`
              : ''}
          </small>
        </Card.Title>

        <Table striped bordered hover size="sm" responsive className="mb-0">
          <thead>
            <tr>
              <th>Player</th>
              <th>Remaining</th>
              <th>Last Visit</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const s = scoreByPlayerId.get(p.id);
              const remaining = s?.remaining;
              const lastVisit = s?.lastVisit;

              const isCurrent = p.id === currentPlayerId;
              const isWinner = isFinished && remaining === 0;

              return (
                <tr key={p.id} className={isCurrent ? 'table-active' : undefined}>
                  <td>
                    {p.name}{' '}
                    {isCurrent && !isFinished && (
                      <Badge bg="info" pill>
                        To throw
                      </Badge>
                    )}
                    {isWinner && (
                      <Badge bg="success" pill className="ms-1">
                        Winner
                      </Badge>
                    )}
                  </td>
                  <td>{remaining != null ? remaining : '-'}</td>
                  <td>{lastVisit != null ? lastVisit : '-'}</td>
                  <td>
                    {isWinner
                      ? 'Finished'
                      : isCurrent && !isFinished
                      ? 'On turn'
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

export default GameScoreboard;
