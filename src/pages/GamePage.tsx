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

function getWinnerId(game: GameState): string | null {
  const anyGame: any = game;
  return anyGame.winnerId ?? anyGame.winner?.id ?? anyGame.matchScore?.winnerId ?? null;
}

function getCurrentLegNumber(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms?.sets?.length) return 1;

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

function getRoundNumber(game: GameState) {
  const playersCount = Math.max(1, game.players.length);
  const ms: any = (game as any).matchScore;

  if (!ms?.sets?.length) {
    const visits = ((game as any).history ?? []).length ?? 0;
    return Math.floor(visits / playersCount) + 1;
  }

  const currentLegHistory = getCurrentLegHistory(game);
  return Math.floor((currentLegHistory.length ?? 0) / playersCount) + 1;
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

function formatResultLine(game: GameState): string {
  const anyGame: any = game;
  const ms: any = anyGame.matchScore;
  if (!ms?.sets?.length) return '';

  const setWins: Record<string, number> = {};
  for (const s of ms.sets ?? []) {
    if (!s?.winnerId) continue;
    setWins[s.winnerId] = (setWins[s.winnerId] ?? 0) + 1;
  }

  const p0 = game.players?.[0];
  const p1 = game.players?.[1];
  if (!p0 || !p1) return '';

  return `${p0.name}: ${setWins[p0.id] ?? 0} sets • ${p1.name}: ${setWins[p1.id] ?? 0} sets`;
}

/** colored dart icon (SVG uses currentColor) */
function TurnDartIcon() {
  return (
    <svg className="gp-turnDart" viewBox="0 0 64 64" aria-hidden="true">
      {/* simple stylized dart */}
      <path d="M8 40 L28 20 L44 36 L24 56 Z" />
      <path d="M28 20 L52 12 L60 20 L44 36 Z" />
      <path d="M8 40 L4 44 L20 60 L24 56 Z" />
    </svg>
  );
}

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const gameId = (params.id || (params as any).gameId || '') as string;

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

  // Between legs/sets modal (existing logic in your file – keep)
  const [betweenModal, setBetweenModal] = useState<null | { kind: 'leg' | 'set'; winnerName: string }>(null);
  const betweenShownRef = useRef(false);
  const prevLegKeyRef = useRef<string>('');

  const possibleVisitScores = useMemo(() => computePossibleVisitScores(), []);
  const quick = useMemo(() => [26, 41, 45, 60, 81, 85], []);

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

  const isFinished = game.status === 'finished';
  const isBlockedByModal = showFinishModal || !!betweenModal;

  const scoreByPlayerId = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of game.scores) m.set(s.playerId, s);
    return m;
  }, [game.scores]);

  const currentPlayer =
    game.players.find((p) => p.id === game.currentPlayerId) ?? game.players[0];

  const roundNumber = getRoundNumber(game);
  const legNumber = getCurrentLegNumber(game);

  const leftPlayer = game.players[0] ?? null;
  const rightPlayer = game.players[1] ?? null;

  const leftRemaining = leftPlayer ? scoreByPlayerId.get(leftPlayer.id)?.remaining : null;
  const rightRemaining = rightPlayer ? scoreByPlayerId.get(rightPlayer.id)?.remaining : null;

  const isCurrent = (id?: string) => !!id && id === game.currentPlayerId;

  const ms: any = (game as any).matchScore;
  const legsWonByPlayer = useMemo(() => {
    if (!ms?.sets?.length) return {};
    const set = ms.sets[ms.currentSetIndex];
    if (!set) return {};
    return computeLegsWonInSet(set);
  }, [ms]);

  // ✅ avg visit score per round for CURRENT LEG ONLY
  const avgVisitByPlayer = useMemo(() => {
    const currentLegHistory = getCurrentLegHistory(game);
    const totals: Record<string, { sum: number; visits: number }> = {};

    for (const t of currentLegHistory) {
      const pid = String((t as any).playerId ?? '');
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

  // Between legs/sets detection (keep behavior)
  useEffect(() => {
    if (!ms?.sets?.length) return;

    const set = ms.sets[ms.currentSetIndex];
    const legKey = `${ms.currentSetIndex}-${ms.currentLegIndex}`;

    if (!prevLegKeyRef.current) {
      prevLegKeyRef.current = legKey;
      return;
    }

    if (prevLegKeyRef.current !== legKey) {
      if (!betweenShownRef.current) {
        // you can enhance winner text later; keep minimal now
        setBetweenModal({ kind: 'leg', winnerName: '—' });
        betweenShownRef.current = true;
      }
      prevLegKeyRef.current = legKey;
    }
  }, [ms]);

  // Finish modal open logic
  useEffect(() => {
    if (game.status === 'finished' && !finishShownRef.current) {
      setShowFinishModal(true);
      finishShownRef.current = true;
    }
  }, [game.status]);

  const setDigit = (d: string) => {
    setInput((prev) => {
      const next = prev === '0' ? d : prev + d;
      const num = clamp(parseInt(next, 10), 0, 180);
      return String(num);
    });
  };

  const setQuick = (n: number) => setInput(String(n));

  const canSubmitValue = (value: number) => {
    if (Number.isNaN(value)) return false;
    if (value < 0 || value > 180) return false;
    return possibleVisitScores.has(value);
  };

  const submit = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    const value = Number(input);
    if (!canSubmitValue(value)) {
      showToast('Invalid score.', 'warning');
      return;
    }

    // ✅ HARD-GUARD: ensure a non-empty playerId is always sent
    const pid =
      String(game.currentPlayerId ?? '').trim() ||
      String(currentPlayer?.id ?? '').trim() ||
      String(game.players?.[0]?.id ?? '').trim();

    if (!pid) {
      showToast('Cannot submit: missing player id.', 'danger');
      return;
    }

    postThrow(
      { playerId: pid, visitScore: value, dartsThrown: 3 },
      {
        onSuccess() {
          // no toast on scoring
          setInput('0');
        },
        onError(err: any) {
          console.error('Failed to post throw', err);
          showToast('Failed to submit score. Please try again.', 'danger');
        },
      }
    );
  };

  const onUndo = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;
    undoThrow(undefined, {
      onError(err: any) {
        console.error('Failed to undo', err);
        showToast('Failed to undo.', 'danger');
      },
    });
  };

  const winnerId = getWinnerId(game);
  const winnerName =
    (winnerId && game.players.find((p) => p.id === winnerId)?.name) ?? '';

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

          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Exit game"
            onClick={() => navigate('/')}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="gp-panels">
        <div className={`gp-panel ${isCurrent(leftPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(leftPlayer?.id) ? <TurnDartIcon /> : null}</div>
          <div className="gp-panel__score">{leftRemaining ?? '-'}</div>
          <div className="gp-panel__name">{leftPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">{(legsWonByPlayer[leftPlayer?.id ?? ''] ?? 0)} LEGS WON</div>
          <div className="gp-panel__avg">{(avgVisitByPlayer[leftPlayer?.id ?? ''] ?? 0).toFixed(1)}</div>
        </div>

        <div className={`gp-panel ${isCurrent(rightPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(rightPlayer?.id) ? <TurnDartIcon /> : null}</div>
          <div className="gp-panel__score">{rightRemaining ?? '-'}</div>
          <div className="gp-panel__name">{rightPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">{(legsWonByPlayer[rightPlayer?.id ?? ''] ?? 0)} LEGS WON</div>
          <div className="gp-panel__avg">{(avgVisitByPlayer[rightPlayer?.id ?? ''] ?? 0).toFixed(1)}</div>
        </div>
      </div>

      <div className="gp-inputRow">
        <div className="gp-input">{input}</div>
      </div>

      {/* ✅ KEYPAD ORDER FIXED:
          - quick scores first (2 rows)
          - digits 1-9 next
          - LAST ROW: [spacer] [0] [submit]
          - NO backspace button
      */}
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
            key={`d-${d}`}
            type="button"
            className="gp-key"
            onClick={() => setDigit(d)}
            disabled={posting || undoing || isFinished || isBlockedByModal}
          >
            {d}
          </button>
        ))}

        {/* spacer to keep 0 centered */}
        <div className="gp-key gp-key--spacer" />

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

        {/* keep undo if you want it, but not in the keypad (optional).
            If you prefer it removed too, tell me and I’ll delete it. */}
      </div>

      {/* BETWEEN LEGS/SETS MODAL */}
      <Modal
        show={!!betweenModal}
        centered
        onHide={() => {
          setBetweenModal(null);
          betweenShownRef.current = false;
        }}
        contentClassName="gp-finishModal"
      >
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">
            {betweenModal?.kind === 'set' ? 'Set Finished' : 'Leg Finished'}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            Winner:{' '}
            <span className="gp-finishModal__winnerName">
              {betweenModal?.winnerName ?? 'N/A'}
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button
            type="button"
            className="gp-finishBtn gp-finishBtn--primary"
            onClick={() => {
              setBetweenModal(null);
              betweenShownRef.current = false;
            }}
          >
            NEXT
          </button>
        </Modal.Footer>
      </Modal>

      {/* FINISH MODAL */}
      <Modal
        show={showFinishModal}
        centered
        onHide={() => setShowFinishModal(false)}
        contentClassName="gp-finishModal"
      >
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">MATCH FINISHED</Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            Winner:{' '}
            <span className="gp-finishModal__winnerName">{winnerName || '-'}</span>
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

      {/* optional floating undo (not requested; remove if you want) */}
      <button
        type="button"
        className="gp-fabUndo"
        onClick={onUndo}
        disabled={posting || undoing || isFinished || isBlockedByModal}
        aria-label="Undo"
        title="Undo"
      >
        ↩
      </button>
    </div>
  );
}
