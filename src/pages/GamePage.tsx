import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Modal, Spinner } from 'react-bootstrap';
import { GiDart } from 'react-icons/gi';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import { useToast } from '../components/ToastProvider';
import type { GameState, SetScore } from '../types/darts';

import '../styles/GamePage.css';

/** -------------------------
 * Helpers
 * ------------------------*/
function computeLegsWonInSet(set: SetScore): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const leg of set.legs) {
    if (!leg.winnerId) continue;
    wins[leg.winnerId] = (wins[leg.winnerId] ?? 0) + 1;
  }
  return wins;
}

function computePossibleVisitScores(): Set<number> {
  const dartValues = new Set<number>();
  dartValues.add(0);

  for (let n = 1; n <= 20; n++) {
    dartValues.add(n);
    dartValues.add(2 * n);
    dartValues.add(3 * n);
  }
  dartValues.add(25);
  dartValues.add(50);

  const values = Array.from(dartValues);
  const possible = new Set<number>();
  for (const a of values) for (const b of values) for (const c of values) possible.add(a + b + c);
  return possible;
}

function getWinnerId(game: GameState): string | null {
  const anyGame: any = game;
  return anyGame.winnerId ?? anyGame.winner?.id ?? anyGame.matchScore?.winnerId ?? null;
}

function countSetsWon(matchScore: any, playerId: string): number {
  const sets = matchScore?.sets ?? [];
  let won = 0;
  for (const s of sets) {
    if (s?.winnerId === playerId) won += 1;
  }
  return won;
}

function countLegsWonTotal(matchScore: any, playerId: string): number {
  const sets = matchScore?.sets ?? [];
  let won = 0;
  for (const s of sets) {
    const legs = s?.legs ?? [];
    for (const l of legs) {
      if (l?.winnerId === playerId) won += 1;
    }
  }
  return won;
}

function getRoundNumber(game: GameState) {
  const playersCount = Math.max(1, game.players.length);
  const history = (game as any).history ?? [];
  const ms: any = (game as any).matchScore;

  if (!ms?.sets?.length) {
    const visits = history.length ?? 0;
    return Math.floor(visits / playersCount) + 1;
  }

  const set = ms.sets[ms.currentSetIndex];
  const legIdx = ms.currentLegIndex;

  let lastFinishedAt: string | null = null;

  if (legIdx > 0) {
    const prevLeg = set.legs[legIdx - 1];
    lastFinishedAt = prevLeg?.finishedAt ?? null;
  } else if (ms.currentSetIndex > 0) {
    const prevSet = ms.sets[ms.currentSetIndex - 1];
    const prevLeg = prevSet?.legs?.[prevSet.legs.length - 1];
    lastFinishedAt = prevLeg?.finishedAt ?? null;
  }

  const since = lastFinishedAt
    ? history.filter((t: any) => new Date(t.createdAt).getTime() > new Date(lastFinishedAt!).getTime()).length
    : history.length;

  return Math.floor(since / playersCount) + 1;
}

function getCurrentLegNumber(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms || !ms.sets || ms.currentSetIndex == null || ms.currentLegIndex == null) return 1;

  const set = ms.sets[ms.currentSetIndex];
  const leg = set?.legs?.[ms.currentLegIndex];
  return leg?.legNumber ?? ms.currentLegIndex + 1;
}

function getCurrentLegHistory(game: GameState) {
  const history = ((game as any).history ?? []) as any[];
  const ms: any = (game as any).matchScore;

  if (!ms?.sets?.length) return history;

  const set = ms.sets[ms.currentSetIndex];
  const legIdx = ms.currentLegIndex;

  let lastFinishedAt: string | null = null;

  if (legIdx > 0) {
    lastFinishedAt = set?.legs?.[legIdx - 1]?.finishedAt ?? null;
  } else if (ms.currentSetIndex > 0) {
    const prevSet = ms.sets[ms.currentSetIndex - 1];
    lastFinishedAt = prevSet?.legs?.[prevSet.legs.length - 1]?.finishedAt ?? null;
  }

  if (!lastFinishedAt) return history;

  const t0 = new Date(lastFinishedAt).getTime();
  return history.filter((t) => new Date(t.createdAt).getTime() > t0);
}

function buildFinalStandings(game: GameState) {
  const ms: any = (game as any).matchScore;
  const hasMatchScore = !!ms?.sets?.length;

  const standings = (game.players ?? []).map((p) => {
    const setsWon = hasMatchScore ? countSetsWon(ms, p.id) : 0;
    const legsWon = hasMatchScore ? countLegsWonTotal(ms, p.id) : 0;
    const remaining = (game.scores ?? []).find((s: any) => s.playerId === p.id)?.remaining;

    return {
      id: p.id,
      name: p.name ?? '-',
      setsWon,
      legsWon,
      remaining: typeof remaining === 'number' ? remaining : null,
    };
  });

  standings.sort((a, b) => {
    if (b.setsWon !== a.setsWon) return b.setsWon - a.setsWon;
    if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
    return String(a.name).localeCompare(String(b.name));
  });

  return standings;
}

function buildResultText(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms?.sets?.length) return null;

  const standings = buildFinalStandings(game);
  const setsLine = standings.map((p) => `${p.name}: ${p.setsWon}`).join(' · ');
  const legsLine = standings.map((p) => `${p.name}: ${p.legsWon}`).join(' · ');

  return { setsLine, legsLine };
}

type BetweenLegsModalInfo = {
  kind: 'leg' | 'set';
  winnerName: string;
};

const MAX_PLAYERS = 8;

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const gameId = (params.id || (params as any).gameId || '') as string;

  useEffect(() => {
    document.body.classList.add('route-game');
    return () => document.body.classList.remove('route-game');
  }, []);

  const { data: game, isLoading, isError, error } = useGame(gameId);
  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId);
  const { mutate: undoThrow, isPending: undoing } = useUndoThrow(gameId);

  const [input, setInput] = useState<string>('0');

  // Finish modal
  const [showFinishModal, setShowFinishModal] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  // Between legs/sets
  const [betweenModal, setBetweenModal] = useState<BetweenLegsModalInfo | null>(null);
  const prevMatchScoreRef = useRef<any>(null);

  const possibleScores = useMemo(() => computePossibleVisitScores(), []);

  const scoreByPlayerId = useMemo(() => {
    const m = new Map<string, any>();
    const scores = game?.scores ?? [];
    for (const s of scores) m.set(s.playerId, s);
    return m;
  }, [game?.scores]);

  const legsWonByPlayer = useMemo(() => {
    const ms: any = (game as any)?.matchScore;
    if (!ms?.sets?.length) return {};
    const set = ms.sets[ms.currentSetIndex];
    if (!set) return {};
    return computeLegsWonInSet(set);
  }, [game]);

  // ✅ Average per player for current leg ONLY, ignoring busts (missed visits)
  const avgVisitByPlayer = useMemo(() => {
    if (!game) return {};

    const hist = getCurrentLegHistory(game);

    const start = (game as any).config?.startingScore ?? 501;
    const doubleOut = !!(game as any).config?.doubleOut;

    const remaining: Record<string, number> = {};
    for (const p of game.players) remaining[p.id] = start;

    const totals: Record<string, { sum: number; visits: number }> = {};

    for (const t of hist) {
      const pid = String((t as any).playerId ?? '');
      const visitScore = Number((t as any).visitScore ?? 0);
      if (!pid) continue;

      const cur = remaining[pid] ?? start;
      const cand = cur - visitScore;

      const isBust = cand < 0 || (doubleOut && cand === 1);

      if (isBust) {
        // miss: do not count & do not change remaining
        continue;
      }

      remaining[pid] = cand;

      totals[pid] = totals[pid] ?? { sum: 0, visits: 0 };
      totals[pid].sum += visitScore;
      totals[pid].visits += 1;
    }

    const out: Record<string, number> = {};
    for (const [pid, v] of Object.entries(totals)) {
      out[pid] = v.visits > 0 ? v.sum / v.visits : 0;
    }
    return out;
  }, [game]);

  const quick = useMemo(() => [26, 41, 45, 60, 81, 85], []);

  useEffect(() => {
    if (isError) showToast('Could not load game. Please try again.', 'danger');
  }, [isError, showToast]);

  // Detect finished => open finish modal once
  useEffect(() => {
    if (!game) return;
    const prev = prevStatusRef.current;
    const curr = game.status;

    if (prev && prev !== 'finished' && curr === 'finished') {
      setShowFinishModal(true);
    }
    prevStatusRef.current = curr;
  }, [game]);

  // Detect leg/set transitions for between-modal
  useEffect(() => {
    if (!game) return;

    const ms: any = (game as any).matchScore;
    if (!ms?.sets) return;

    if (game.status === 'finished') {
      prevMatchScoreRef.current = ms;
      return;
    }

    const prevMs = prevMatchScoreRef.current;
    if (!prevMs?.sets) {
      prevMatchScoreRef.current = ms;
      return;
    }

    const prevSetIdx = prevMs.currentSetIndex;
    const prevLegIdx = prevMs.currentLegIndex;
    const currSetIdx = ms.currentSetIndex;
    const currLegIdx = ms.currentLegIndex;

    const advanced = prevSetIdx !== currSetIdx || prevLegIdx !== currLegIdx;
    if (!advanced) {
      prevMatchScoreRef.current = ms;
      return;
    }

    const prevSet = prevMs.sets?.[prevSetIdx];
    const prevLeg = prevSet?.legs?.[prevLegIdx];
    const winnerId: string | undefined = prevLeg?.winnerId;

    if (!winnerId) {
      prevMatchScoreRef.current = ms;
      return;
    }

    const winnerName = game.players.find((p) => p.id === winnerId)?.name ?? 'Winner';

    const isSetTransition =
      prevSetIdx !== currSetIdx || (prevLegIdx !== currLegIdx && currLegIdx === 0);

    setBetweenModal({
      kind: isSetTransition ? 'set' : 'leg',
      winnerName,
    });

    setInput('0');
    prevMatchScoreRef.current = ms;
  }, [game]);

  if (!gameId) {
    return (
      <div className="gp-wrap gp-center">
        <Alert variant="danger">No game id in URL.</Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="gp-wrap gp-center">
        <Spinner animation="border" role="status" className="mb-2" />
        <div>Loading game...</div>
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="gp-wrap gp-center">
        <Alert variant="danger">
          <Alert.Heading>Could not load game</Alert.Heading>
          <div className="mb-0 small text-muted">{(error as any)?.message ?? 'Unknown error'}</div>
        </Alert>
      </div>
    );
  }

  const players = game.players ?? [];
  const playerCount = players.length;

  if (playerCount > MAX_PLAYERS) {
    return (
      <div className="gp-wrap gp-center">
        <Alert variant="danger">Too many players in this game (max {MAX_PLAYERS}). Please start a new game.</Alert>
      </div>
    );
  }

  const isFinished = game.status === 'finished';
  const isBlockedByModal = !!betweenModal || showFinishModal;

  const currentPlayer = players.find((p) => p.id === game.currentPlayerId) ?? players[0];
  const isCurrent = (id?: string) => id && id === game.currentPlayerId;

  const roundNumber = getRoundNumber(game);
  const legNumber = getCurrentLegNumber(game);

  // Scoreboard grid sizing
  let cols = 1;
  let rows = 1;
  let totalSlots = playerCount;

  if (playerCount === 1) {
    cols = 1;
    rows = 1;
    totalSlots = 1;
  } else if (playerCount === 2) {
    cols = 2;
    rows = 1;
    totalSlots = 2;
  } else if (playerCount === 3) {
    cols = 3;
    rows = 1;
    totalSlots = 3;
  } else if (playerCount === 4) {
    cols = 4;
    rows = 1;
    totalSlots = 4;
  } else {
    cols = 4;
    rows = 2;
    totalSlots = 8; // fixed grid, placeholders for 5-7
  }

  const canSubmitValue = (value: number) => {
    if (!Number.isFinite(value)) return false;
    if (value < 0 || value > 180) return false;
    return possibleScores.has(value);
  };

  const setDigit = (d: string) => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    const next = input === '0' ? d : input + d;
    if (next.length > 3) return;

    const nextNum = Number(next);
    if (!Number.isFinite(nextNum)) return;
    if (nextNum > 180) return;

    if (next.length === 3 && !possibleScores.has(nextNum)) return;

    setInput(next);
  };

  const submitValue = (value: number, opts?: { keepInput?: boolean }) => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    if (!canSubmitValue(value)) {
      showToast('Invalid score.', 'warning');
      return;
    }

    if (!currentPlayer) return;

    if (opts?.keepInput) setInput(String(value));

    postThrow(
      { playerId: currentPlayer.id, visitScore: value, dartsThrown: 3 },
      {
        onSuccess() {
          setInput('0');
        },
        onError(err: any) {
          console.error('Failed to post throw', err);
          showToast('Failed to submit score. Please try again.', 'danger');
        },
      }
    );
  };

  // ✅ Quick buttons submit directly, no input “flash”
  const setQuick = (n: number) => {
    submitValue(n);
  };

  const backspaceOnly = () => {
    setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  // ✅ Undo: current leg only; after undo, prefill the undone visit score in input
  const undoOneThrow = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    const currentLegHist = getCurrentLegHistory(game);
    if (!currentLegHist.length) return;

    const lastTurn = currentLegHist[currentLegHist.length - 1] as any;
    const undoneScore = lastTurn?.visitScore ?? lastTurn?.score ?? lastTurn?.value ?? 0;

    undoThrow(undefined, {
      onSuccess: () => {
        if (typeof undoneScore === 'number' && Number.isFinite(undoneScore)) setInput(String(undoneScore));
        else setInput('0');
      },
      onError: (err: any) => {
        console.error('Failed to undo', err);
        showToast('Nothing to undo in this leg.', 'info');
      },
    });
  };

  // Left arrow: backspace if typing; otherwise undo
  const onLeftArrow = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;
    if (input !== '0') return backspaceOnly();
    undoOneThrow();
  };

  const submit = () => submitValue(Number(input), { keepInput: true });

  const winnerId = getWinnerId(game);
  const winnerName = (winnerId && players.find((p) => p.id === winnerId)?.name) || null;

  return (
    <div className="gp-wrap">
      <div className="gp-top">
        <div className="gp-top__left">
          <span className="gp-top__label">LEG {legNumber}</span>
          <span className="gp-top__label">ROUND {roundNumber}</span>
        </div>

        <div className="gp-top__right">
          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Settings"
            onClick={() => showToast('Settings coming soon.', 'info')}
          >
            ⚙️
          </button>

          <button type="button" className="gp-iconBtn" aria-label="Exit game" onClick={() => navigate('/')}>
            ✕
          </button>
        </div>
      </div>

      {/* SCOREBOARD */}
      <div
        className={`gp-panels gp-panels--cols-${cols} gp-panels--rows-${rows}`}
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {Array.from({ length: totalSlots }).map((_, idx) => {
          const p = players[idx];
          if (!p) return <div key={`empty-${idx}`} className="gp-panel gp-panel--empty" />;

          const remaining = scoreByPlayerId.get(p.id)?.remaining ?? '-';
          const legsWon = (legsWonByPlayer[p.id] ?? 0) as number;
          const avg = (avgVisitByPlayer[p.id] ?? 0) as number;
          const active = isCurrent(p.id);

          return (
            <div key={p.id} className={`gp-panel ${active ? 'is-current' : ''}`}>
              <div className="gp-panel__marker">{active ? <GiDart className="gp-turnDartIcon" /> : null}</div>
              <div className="gp-panel__score">{remaining}</div>
              <div className="gp-panel__name">{String(p.name ?? '-').toUpperCase()}</div>
              <div className="gp-panel__meta">{legsWon} LEGS WON</div>
              <div className="gp-panel__avg">{avg.toFixed(1)}</div>
            </div>
          );
        })}
      </div>

      {/* INPUT */}
      <div className="gp-inputRow">
        <div className="gp-input">{input}</div>
      </div>

      {/* KEYPAD */}
      <div className="gp-pad">
        {quick.map((n) => (
          <button
            key={`q-${n}`}
            type="button"
            className="gp-key gp-key--quick"
            onClick={() => setQuick(n)}
            disabled={posting || undoing || isFinished || isBlockedByModal}
          >
            {n}
          </button>
        ))}

        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            className="gp-key"
            onClick={() => setDigit(d)}
            disabled={posting || undoing || isFinished || isBlockedByModal}
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={onLeftArrow}
          disabled={posting || undoing || isFinished || isBlockedByModal}
          aria-label="Backspace / Undo"
        >
          ‹
        </button>

        <button
          type="button"
          className="gp-key"
          onClick={() => setDigit('0')}
          disabled={posting || undoing || isFinished || isBlockedByModal}
        >
          0
        </button>

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={submit}
          disabled={posting || undoing || isFinished || isBlockedByModal}
          aria-label="Submit"
        >
          ›
        </button>
      </div>

      {/* BETWEEN LEGS / SETS MODAL */}
      <Modal show={!!betweenModal} centered onHide={() => setBetweenModal(null)} contentClassName="gp-finishModal">
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">
            {betweenModal?.kind === 'set' ? 'SET FINISHED' : 'LEG FINISHED'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            Winner: <span className="gp-finishModal__winnerName">{betweenModal?.winnerName}</span>
          </div>
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button type="button" className="gp-finishBtn gp-finishBtn--primary" onClick={() => setBetweenModal(null)}>
            NEXT
          </button>
        </Modal.Footer>
      </Modal>

      {/* FINISH MODAL */}
      <Modal show={showFinishModal} centered onHide={() => setShowFinishModal(false)} contentClassName="gp-finishModal">
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">MATCH FINISHED</Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            Winner: <span className="gp-finishModal__winnerName">{winnerName ?? '-'}</span>
          </div>

          {(() => {
            const standings = buildFinalStandings(game);
            const result = buildResultText(game);

            return (
              <>
                {result ? (
                  <div className="gp-finishModal__result">
                    <div>
                      <strong>Sets:</strong> {result.setsLine}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <strong>Legs:</strong> {result.legsLine}
                    </div>
                  </div>
                ) : (
                  <div className="gp-finishModal__result">Result unavailable (missing matchScore).</div>
                )}

                <div className="gp-finishModal__standings">
                  <div className="gp-finishModal__standingsTitle">Standings</div>

                  <div className="gp-finishModal__standingsList">
                    {standings.map((p, idx) => (
                      <div key={p.id} className="gp-finishModal__standingRow">
                        <div className="gp-finishModal__standingPos">{idx + 1}</div>
                        <div className="gp-finishModal__standingName">{String(p.name).toUpperCase()}</div>
                        <div className="gp-finishModal__standingStats">
                          <span>{p.setsWon}S</span>
                          <span>{p.legsWon}L</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button type="button" className="gp-finishBtn" onClick={() => navigate('/')}>
            END
          </button>
          <button type="button" className="gp-finishBtn gp-finishBtn--primary" onClick={() => navigate('/new-game')}>
            NEW GAME
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
