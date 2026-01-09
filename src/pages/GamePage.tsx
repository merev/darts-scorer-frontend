import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Modal, Spinner } from 'react-bootstrap';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import { useToast } from '../components/ToastProvider';
import type { GameState, SetScore } from '../types/darts';

import '../styles/GamePage.css';

/** helpers */
function computeLegsWonInSet(set: SetScore): Record<string, number> {
  const wins: Record<string, number> = {};
  for (const leg of set.legs) {
    if (!leg.winnerId) continue;
    wins[leg.winnerId] = (wins[leg.winnerId] ?? 0) + 1;
  }
  return wins;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getCurrentLegThrows(game: GameState) {
  const history = (game as any).history ?? [];
  const ms: any = (game as any).matchScore;

  // No sets/legs system -> all history belongs to the (only) leg
  if (!ms?.sets?.length) return history;

  const set = ms.sets[ms.currentSetIndex];
  const legIdx = ms.currentLegIndex;

  // Find the previous finished leg end time (if any)
  let lastFinishedAt: string | null = null;

  if (legIdx > 0) {
    const prevLeg = set.legs[legIdx - 1];
    lastFinishedAt = prevLeg?.finishedAt ?? null;
  } else if (ms.currentSetIndex > 0) {
    const prevSet = ms.sets[ms.currentSetIndex - 1];
    const prevLeg = prevSet?.legs?.[prevSet.legs.length - 1];
    lastFinishedAt = prevLeg?.finishedAt ?? null;
  }

  return lastFinishedAt
    ? history.filter((t: any) => new Date(t.createdAt).getTime() > new Date(lastFinishedAt!).getTime())
    : history;
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

  // Find the previous finished leg end time (if any)
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

function getLegNumber(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms?.sets?.length) return 1;
  const set = ms.sets[ms.currentSetIndex];
  const leg = set?.legs?.[ms.currentLegIndex];
  return leg?.legNumber ?? ms.currentLegIndex + 1;
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

function formatResultLine(game: GameState): string {
  const anyGame: any = game;
  const ms: any = anyGame.matchScore;

  // If matchScore exists, try to show sets/legs summary
  if (ms?.sets?.length) {
    const sets = ms.sets ?? [];
    const setWins: Record<string, number> = {};

    for (const s of sets) {
      if (!s?.winnerId) continue;
      setWins[s.winnerId] = (setWins[s.winnerId] ?? 0) + 1;
    }

    const p0 = game.players?.[0];
    const p1 = game.players?.[1];

    const a = p0?.id ? (setWins[p0.id] ?? 0) : 0;
    const b = p1?.id ? (setWins[p1.id] ?? 0) : 0;

    if (p0 && p1) return `${p0.name}: ${a} sets • ${p1.name}: ${b} sets`;
  }

  return '';
}

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Full-bleed mode only for this route
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
  const finishShownRef = useRef(false);

  // Between-legs modal
  const [showBetweenModal, setShowBetweenModal] = useState(false);
  const betweenShownRef = useRef(false);
  const prevLegKeyRef = useRef<string>('');

  const isFinished = game?.status === 'finished';
  const winnerId = game ? getWinnerId(game) : null;
  const winnerName = useMemo(() => {
    if (!game || !winnerId) return '';
    const p = game.players.find((x) => x.id === winnerId);
    return p?.name ?? '';
  }, [game, winnerId]);

  const roundNumber = useMemo(() => (game ? getRoundNumber(game) : 1), [game]);
  const legNumber = useMemo(() => (game ? getLegNumber(game) : 1), [game]);

  // Determine current player & ordering (left/right)
  const leftPlayer = game?.players?.[0] ?? null;
  const rightPlayer = game?.players?.[1] ?? null;

  const leftRemaining = useMemo(() => {
    if (!game || !leftPlayer) return null;
    const s = game.scores.find((x) => x.playerId === leftPlayer.id);
    return s?.remaining ?? null;
  }, [game, leftPlayer]);

  const rightRemaining = useMemo(() => {
    if (!game || !rightPlayer) return null;
    const s = game.scores.find((x) => x.playerId === rightPlayer.id);
    return s?.remaining ?? null;
  }, [game, rightPlayer]);

  const isCurrent = (playerId?: string | null) => !!playerId && game?.currentPlayerId === playerId;

  const legsWonByPlayer = useMemo(() => {
    const ms: any = (game as any)?.matchScore;
    if (!ms?.sets?.length) return {};
    const set = ms.sets[ms.currentSetIndex];
    if (!set) return {};
    return computeLegsWonInSet(set);
  }, [game]);

  // Average visit score per round (visit) for the CURRENT LEG only
  const avgVisitByPlayer = useMemo(() => {
    if (!game) return {};
    const currentLegHistory = getCurrentLegThrows(game);
    const totals: Record<string, { sum: number; visits: number }> = {};

    for (const t of currentLegHistory) {
      const pid = (t as any).playerId as string;
      const vs = Number((t as any).visitScore ?? 0);
      if (!pid) continue;
      totals[pid] = totals[pid] ?? { sum: 0, visits: 0 };
      totals[pid].sum += vs;
      totals[pid].visits += 1;
    }

    const out: Record<string, number> = {};
    for (const [pid, v] of Object.entries(totals)) {
      out[pid] = v.visits > 0 ? v.sum / v.visits : 0;
    }
    return out;
  }, [game]);

  const quick = useMemo(() => [26, 41, 45, 60, 81, 85], []);

  // Track current leg key to show between modal ONLY when a leg finishes
  useEffect(() => {
    if (!game) return;

    const ms: any = (game as any).matchScore;
    if (!ms?.sets?.length) return;

    const set = ms.sets[ms.currentSetIndex];
    const leg = set?.legs?.[ms.currentLegIndex];
    const legKey = `${ms.currentSetIndex}-${ms.currentLegIndex}`;

    // On initial load set ref
    if (!prevLegKeyRef.current) {
      prevLegKeyRef.current = legKey;
      return;
    }

    // Detect transition to a new leg (means previous leg finished)
    if (prevLegKeyRef.current !== legKey) {
      if (!betweenShownRef.current) {
        setShowBetweenModal(true);
        betweenShownRef.current = true;
      }
      prevLegKeyRef.current = legKey;
    }

    // Reset the flag if still same leg and not in modal
    if (!showBetweenModal) {
      betweenShownRef.current = false;
    }
  }, [game, showBetweenModal]);

  // Finish modal open logic
  useEffect(() => {
    if (!game) return;

    if (game.status === 'finished' && !finishShownRef.current) {
      setShowFinishModal(true);
      finishShownRef.current = true;
    }
  }, [game]);

  const possibleVisitScores = useMemo(() => computePossibleVisitScores(), []);

  const isBlockedByModal = showFinishModal || showBetweenModal;

  const onDigit = (d: number) => {
    setInput((prev) => {
      const next = prev === '0' ? String(d) : prev + String(d);
      const num = clamp(parseInt(next, 10), 0, 180);
      return String(num);
    });
  };

  const onLeftArrow = () => {
    // backspace
    setInput((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const onRightArrow = () => {
    if (!game) return;

    const num = clamp(parseInt(input || '0', 10), 0, 180);

    if (!possibleVisitScores.has(num)) {
      showToast('Invalid visit score for 3 darts.', 'warning');
      return;
    }

    postThrow(
      { visitScore: num, dartsThrown: 3 },
      {
        onSuccess: () => {
          setInput('0');
        },
        onError: (e: any) => {
          const msg = e?.message ?? 'Could not submit score.';
          showToast(msg, 'danger');
        },
      },
    );
  };

  const setQuick = (n: number) => {
    setInput(String(n));
  };

  const onUndo = () => {
    undoThrow(undefined, {
      onError: (e: any) => {
        const msg = e?.message ?? 'Could not undo.';
        showToast(msg, 'danger');
      },
    });
  };

  if (!gameId) {
    return (
      <div className="gp-center">
        <Alert variant="danger">Missing game id.</Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="gp-center">
        <Spinner animation="border" role="status" />
      </div>
    );
  }

  if (isError || !game) {
    return (
      <div className="gp-center">
        <Alert variant="danger">
          Failed to load game.
          <div style={{ opacity: 0.7, marginTop: 6 }}>{String((error as any)?.message ?? '')}</div>
        </Alert>
      </div>
    );
  }

  const resultLine = formatResultLine(game);

  return (
    <div className="gp-wrap">
      <div className="gp-top">
        <div className="gp-top__left">
          <span className="gp-top__label">
            LEG {legNumber} &nbsp;&nbsp; ROUND {roundNumber}
          </span>
        </div>

        <div className="gp-top__right">
          <span className="gp-top__live">LIVE</span>

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

      <div className="gp-panels">
        <div className={`gp-panel ${isCurrent(leftPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(leftPlayer?.id) ? '🎯' : ''}</div>
          <div className="gp-panel__score">{leftRemaining ?? '-'}</div>
          <div className="gp-panel__name">{leftPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">{(legsWonByPlayer[leftPlayer?.id ?? ''] ?? 0)} LEGS WON</div>
          <div className="gp-panel__avg">{(avgVisitByPlayer[leftPlayer?.id ?? ''] ?? 0).toFixed(1)}</div>
        </div>

        <div className={`gp-panel ${isCurrent(rightPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(rightPlayer?.id) ? '🎯' : ''}</div>
          <div className="gp-panel__score">{rightRemaining ?? '-'}</div>
          <div className="gp-panel__name">{rightPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">{(legsWonByPlayer[rightPlayer?.id ?? ''] ?? 0)} LEGS WON</div>
          <div className="gp-panel__avg">{(avgVisitByPlayer[rightPlayer?.id ?? ''] ?? 0).toFixed(1)}</div>
        </div>
      </div>

      <div className="gp-inputRow">
        <div className="gp-input">{input}</div>
      </div>

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
          className="gp-key gp-key--action"
          onClick={() => onDigit(0)}
          disabled={posting || undoing || isFinished || isBlockedByModal}
          aria-label="0"
        >
          0
        </button>

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={onRightArrow}
          disabled={posting || undoing || isFinished || isBlockedByModal}
          aria-label="Submit"
        >
          ›
        </button>

        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={`d-${d}`}
            type="button"
            className="gp-key"
            onClick={() => onDigit(d)}
            disabled={posting || undoing || isFinished || isBlockedByModal}
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={onUndo}
          disabled={posting || undoing || isFinished || isBlockedByModal}
          aria-label="Undo"
        >
          ↩
        </button>
      </div>

      {/* Between-legs modal */}
      <Modal
        show={showBetweenModal}
        centered
        onHide={() => setShowBetweenModal(false)}
        contentClassName="gp-finishModal"
      >
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">LEG FINISHED</Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-between__line">Next leg is ready.</div>
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button type="button" className="gp-finishBtn gp-finishBtn--primary" onClick={() => setShowBetweenModal(false)}>
            NEXT
          </button>
        </Modal.Footer>
      </Modal>

      {/* Finish modal */}
      <Modal show={showFinishModal} centered onHide={() => setShowFinishModal(false)} contentClassName="gp-finishModal">
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">MATCH FINISHED</Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            Winner: <span className="gp-finishModal__winnerName">{winnerName || '-'}</span>
          </div>

          {resultLine ? <div className="gp-finishModal__result">{resultLine}</div> : null}
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button
            type="button"
            className="gp-finishBtn"
            onClick={() => {
              setShowFinishModal(false);
              navigate('/');
            }}
          >
            END
          </button>

          <button
            type="button"
            className="gp-finishBtn gp-finishBtn--primary"
            onClick={() => {
              setShowFinishModal(false);
              navigate('/new-game');
            }}
          >
            NEW GAME
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
