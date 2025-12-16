// src/components/games/GameScoreboard.tsx
import { Card, Table, Badge } from 'react-bootstrap';
import type {
  GameState,
  PlayerScore,
  MatchScore,
  SetScore,
  LegScore,
} from '../../types/darts';

interface Props {
  game: GameState;
}

// helpers to compute wins
function computeLegsWonInSet(set: SetScore): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const leg of set.legs) {
    if (!leg.winnerId) continue;
    wins[leg.winnerId] = (wins[leg.winnerId] ?? 0) + 1;
  }
  return wins;
}

function computeSetsWon(match: MatchScore): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const set of match.sets) {
    if (!set.winnerId) continue;
    wins[set.winnerId] = (wins[set.winnerId] ?? 0) + 1;
  }
  return wins;
}

function GameScoreboard({ game }: Props) {
  const { players, scores, currentPlayerId, status, matchScore, config } = game;

  const scoreByPlayerId = new Map<string, PlayerScore>();
  for (const s of scores) {
    scoreByPlayerId.set(s.playerId, s);
  }

  const isFinished = status === 'finished';

  // --- match / set / leg info ---
  const currentSet =
    matchScore && matchScore.sets[matchScore.currentSetIndex]
      ? matchScore.sets[matchScore.currentSetIndex]
      : undefined;

  const currentLeg =
    currentSet && currentSet.legs[matchScore!.currentLegIndex]
      ? currentSet.legs[matchScore!.currentLegIndex]
      : undefined;

  const currentLegWinnerId = currentLeg?.winnerId;

  const legsWonInCurrentSet =
    currentSet != null ? computeLegsWonInSet(currentSet) : {};

  const setsWon = matchScore != null ? computeSetsWon(matchScore) : {};

  return (
    <Card>
      <Card.Body>
        <Card.Title className="d-flex justify-content-between align-items-center mb-2">
          <span>Scoreboard</span>
          <small className="text-muted">
            Mode: {config.mode}{' '}
            {config.mode === 'X01' && config.startingScore
              ? `(${config.startingScore})`
              : ''}
          </small>
        </Card.Title>

        {matchScore && (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <small className="text-muted">
                Set{' '}
                {currentSet?.setNumber != null ? currentSet.setNumber : '-'} •
                {' '}
                Leg{' '}
                {currentLeg?.legNumber != null ? currentLeg.legNumber : '-'}
              </small>
              <small className="text-muted">
                First to {matchScore.setsToWin} set
                {matchScore.setsToWin > 1 ? 's' : ''},{' '}
                first to {config.legs} leg
                {config.legs > 1 ? 's' : ''} per set
              </small>
            </div>

            {/* sets / legs summary per player */}
            <Table
              striped
              bordered
              hover
              size="sm"
              responsive
              className="mb-3"
            >
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Sets</th>
                  <th>Legs (current set)</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const playerSetsWon = setsWon[p.id] ?? 0;
                  const playerLegsWon = legsWonInCurrentSet[p.id] ?? 0;

                  return (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{playerSetsWon}</td>
                      <td>{playerLegsWon}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </>
        )}

        {/* per-leg X01 scoreboard (what you already had) */}
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
              const isMatchWinner =
                isFinished && (remaining === 0 || game.winnerId === p.id);
              const isLegWinner =
                !isFinished && currentLegWinnerId != null && currentLegWinnerId === p.id;

              return (
                <tr key={p.id} className={isCurrent ? 'table-active' : undefined}>
                  <td>
                    {p.name}{' '}
                    {isCurrent && !isFinished && !isLegWinner && (
                      <Badge bg="info" pill>
                        To throw
                      </Badge>
                    )}
                    {isLegWinner && (
                      <Badge bg="success" pill className="ms-1">
                        Leg winner
                      </Badge>
                    )}
                    {isMatchWinner && (
                      <Badge bg="success" pill className="ms-1">
                        Match winner
                      </Badge>
                    )}
                  </td>
                  <td>{remaining != null ? remaining : '-'}</td>
                  <td>{lastVisit != null ? lastVisit : '-'}</td>
                  <td>
                    {isMatchWinner
                      ? 'Match won'
                      : isLegWinner
                      ? 'Leg won'
                      : isCurrent && !isFinished
                      ? 'On turn'
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>

        {/* Optional: legs overview under the main table */}
        {matchScore && (
          <div className="mt-3">
            <small className="text-muted d-block mb-1">Legs overview</small>
            <Table
              bordered
              size="sm"
              responsive
              className="mb-0"
            >
              <thead>
                <tr>
                  <th>Set</th>
                  <th>Leg</th>
                  <th>Winner</th>
                </tr>
              </thead>
              <tbody>
                {matchScore.sets.map((set, setIdx) =>
                  set.legs.map((leg, legIdx) => {
                    const winnerPlayer =
                      leg.winnerId &&
                      players.find((p) => p.id === leg.winnerId);

                    const isCurrentLeg =
                      setIdx === matchScore.currentSetIndex &&
                      legIdx === matchScore.currentLegIndex;

                    return (
                      <tr key={`${set.setNumber}-${leg.legNumber}`}>
                        <td>{set.setNumber}</td>
                        <td>
                          {leg.legNumber}{' '}
                          {isCurrentLeg && (
                            <Badge bg="info" pill className="ms-1">
                              Current
                            </Badge>
                          )}
                        </td>
                        <td>
                          {winnerPlayer ? (
                            <>
                              {winnerPlayer.name}{' '}
                              <Badge bg="success" pill className="ms-1">
                                Won
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted">In progress</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

export default GameScoreboard;
