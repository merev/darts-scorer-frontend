import { Table, Badge } from 'react-bootstrap';
import type { GameState } from '../../types/darts';

interface ScoreboardProps {
  game: GameState;
}

function Scoreboard({ game }: ScoreboardProps) {
  return (
    <Table striped bordered hover responsive size="sm">
      <thead>
        <tr>
          <th>Player</th>
          {game.config.mode === 'X01' && <th>Remaining</th>}
          <th>Last Visit</th>
          <th>Last 3 Darts</th>
          <th>Turn</th>
        </tr>
      </thead>
      <tbody>
        {game.scores.map(score => {
          const player = game.players.find(p => p.id === score.playerId)!;
          const isCurrent = game.currentPlayerId === score.playerId;

          return (
            <tr key={score.playerId}>
              <td>
                {player.name}{' '}
                {isCurrent && <Badge bg="success">Throwing</Badge>}
              </td>
              {game.config.mode === 'X01' && (
                <td>{score.remaining ?? '-'}</td>
              )}
              <td>{score.lastVisit ?? '-'}</td>
              <td>
                {score.lastThreeDarts && score.lastThreeDarts.length
                  ? score.lastThreeDarts.join(', ')
                  : '-'}
              </td>
              <td>{isCurrent ? '→' : ''}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export default Scoreboard;
