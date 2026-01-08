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


function getCurrentLegNumber(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms || !ms.sets || ms.currentSetIndex == null || ms.currentLegIndex == null) return 1;

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
  if (typeof anyGame.result === 'string') return anyGame.result;

  const p1 = game.players?.[0]?.name ?? 'Player 1';
  const p2 = game.players?.[1]?.name ?? 'Player 2';
  return `${p1} vs ${p2}`;
}

type BetweenLegsModalInfo = {
  kind: 'leg' | 'set';
  winnerName: string;
  leftName: string;
  rightName: string;
  leftLegsWon: number;
  rightLegsWon: number;
  leftSetsWon: number;
  rightSetsWon: number;
};

function countSetsWon(matchScore: any, playerId: string): number {
  const sets = matchScore?.sets ?? [];
  let won = 0;
  for (const s of sets) {
    if (s?.winnerId === playerId) won += 1;
  }
  return won;
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
  const prevStatusRef = useRef<string | null>(null);

  // Between-legs/sets modal
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

  const quick = useMemo(() => [26, 41, 45, 60, 81, 85], []);

  useEffect(() => {
    if (isError) showToast('Could not load game. Please try again.', 'danger');
  }, [isError, showToast]);

  // Detect game finished => open finish modal once
  useEffect(() => {
    if (!game) return;

    const prev = prevStatusRef.current;
    const curr = game.status;

    if (prev && prev !== 'finished' && curr === 'finished') {
      setShowFinishModal(true);
    }

    prevStatusRef.current = curr;
  }, [game]);

  // Detect leg/set transition (when backend advances current leg/set)
  useEffect(() => {
    if (!game) return;

    const ms: any = (game as any).matchScore;
    if (!ms?.sets) return;

    // Don't show between-legs modal if the game is finished
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

    const advanced =
      prevSetIdx !== currSetIdx || prevLegIdx !== currLegIdx;

    if (!advanced) {
      prevMatchScoreRef.current = ms;
      return;
    }

    // Previous leg winner is stored on the leg that just completed
    const prevSet = prevMs.sets?.[prevSetIdx];
    const prevLeg = prevSet?.legs?.[prevLegIdx];
    const winnerId: string | undefined = prevLeg?.winnerId;

    if (!winnerId) {
      prevMatchScoreRef.current = ms;
      return;
    }

    const left = game.players?.[0];
    const right = game.players?.[1];
    if (!left || !right) {
      prevMatchScoreRef.current = ms;
      return;
    }

    const winnerName = game.players.find((p) => p.id === winnerId)?.name ?? 'Winner';

    // Determine if it was a set transition (set index changed OR leg index reset)
    const isSetTransition =
      prevSetIdx !== currSetIdx || (prevLegIdx !== currLegIdx && currLegIdx === 0);

    const prevLegsWon = computeLegsWonInSet(prevSet as any);
    const leftLegsWon = prevLegsWon[left.id] ?? 0;
    const rightLegsWon = prevLegsWon[right.id] ?? 0;

    const leftSetsWon = countSetsWon(prevMs, left.id);
    const rightSetsWon = countSetsWon(prevMs, right.id);

    setBetweenModal({
      kind: isSetTransition ? 'set' : 'leg',
      winnerName,
      leftName: left.name,
      rightName: right.name,
      leftLegsWon,
      rightLegsWon,
      leftSetsWon,
      rightSetsWon,
    });

    // Reset input when changing legs/sets
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
          <div className="mb-0 small text-muted">
            {(error as any)?.message ?? 'Unknown error'}
          </div>
        </Alert>
      </div>
    );
  }

  const isFinished = game.status === 'finished';
  const isBlockedByModal = !!betweenModal || showFinishModal;

  const currentPlayer =
    game.players.find((p) => p.id === game.currentPlayerId) ?? game.players[0];

  const roundNumber = getRoundNumber(game);
  const legNumber = getCurrentLegNumber(game);

  const leftPlayer = game.players[0] ?? null;
  const rightPlayer = game.players[1] ?? null;

  const leftRemaining = leftPlayer ? scoreByPlayerId.get(leftPlayer.id)?.remaining : null;
  const rightRemaining = rightPlayer ? scoreByPlayerId.get(rightPlayer.id)?.remaining : null;

  const isCurrent = (id?: string) => id && id === game.currentPlayerId;

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

    // If forming 3 digits, block impossible totals (179, 185, ...)
    if (next.length === 3 && !possibleScores.has(nextNum)) return;

    setInput(next);
  };

  const setQuick = (n: number) => {
    if (isFinished || posting || undoing || isBlockedByModal) return;
    if (!canSubmitValue(n)) return;
    setInput(String(n));
  };

  const backspaceOnly = () => {
    setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const undoOneThrow = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    undoThrow(undefined, {
      onSuccess: (newState: any) => {
        const hist = newState?.history;
        const last = Array.isArray(hist) ? hist[hist.length - 1] : null;

        const lastScore =
          last?.visitScore ??
          last?.score ??
          last?.value ??
          null;

        if (typeof lastScore === 'number' && Number.isFinite(lastScore)) {
          setInput(String(lastScore));
        } else {
          setInput('0');
        }
      },
      onError: (err: any) => {
        console.error('Failed to undo', err);
        showToast('Nothing to undo.', 'info');
      },
    });
  };

  // LEFT ARROW: backspace; if already 0 => undo
  const onLeftArrow = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;
    if (input !== '0') return backspaceOnly();
    undoOneThrow();
  };

  const submit = () => {
    if (isFinished || posting || undoing || isBlockedByModal) return;

    const value = Number(input);
    if (!canSubmitValue(value)) {
      showToast('Invalid score.', 'warning');
      return;
    }

    if (!currentPlayer) return;

    postThrow(
      { playerId: currentPlayer.id, visitScore: value, dartsThrown: 3 },
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

  const winnerId = getWinnerId(game);
  const winnerName =
    (winnerId && game.players.find((p) => p.id === winnerId)?.name) || null;

  return (
    <div className="gp-wrap">
      <div className="gp-top">
        <div className="gp-top__left">
          <span className="gp-top__label">LEG {legNumber}</span>
          <span className="gp-top__label">ROUND {roundNumber}</span>
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
          <div className="gp-panel__marker">{isCurrent(leftPlayer?.id) ? '➤' : ''}</div>
          <div className="gp-panel__score">{leftRemaining ?? '-'}</div>
          <div className="gp-panel__name">{leftPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">
            {(legsWonByPlayer[leftPlayer?.id ?? ''] ?? 0)} LEGS WON
          </div>
          <div className="gp-panel__avg">0.0</div>
        </div>

        <div className={`gp-panel ${isCurrent(rightPlayer?.id) ? 'is-current' : ''}`}>
          <div className="gp-panel__marker">{isCurrent(rightPlayer?.id) ? '➤' : ''}</div>
          <div className="gp-panel__score">{rightRemaining ?? '-'}</div>
          <div className="gp-panel__name">{rightPlayer?.name?.toUpperCase() ?? '-'}</div>
          <div className="gp-panel__meta">
            {(legsWonByPlayer[rightPlayer?.id ?? ''] ?? 0)} LEGS WON
          </div>
          <div className="gp-panel__avg">0.0</div>
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

      {/* BETWEEN LEGS/SETS MODAL */}
      <Modal
        show={!!betweenModal}
        onHide={() => {}}
        centered
        backdrop="static"
        keyboard={false}
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

          <div className="gp-between__line">
            {betweenModal?.leftName} {betweenModal?.leftLegsWon ?? 0} –{' '}
            {betweenModal?.rightLegsWon ?? 0} {betweenModal?.rightName} (legs in set)
          </div>

          <div className="gp-between__line">
            Sets: {betweenModal?.leftSetsWon ?? 0} – {betweenModal?.rightSetsWon ?? 0}
          </div>
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button
            type="button"
            className="gp-finishBtn gp-finishBtn--primary"
            onClick={() => setBetweenModal(null)}
          >
            Next
          </button>
        </Modal.Footer>
      </Modal>

      {/* FINISH MODAL */}
      <Modal
        show={showFinishModal}
        onHide={() => setShowFinishModal(false)}
        centered
        backdrop="static"
        keyboard={false}
        contentClassName="gp-finishModal"
      >
        <Modal.Header className="gp-finishModal__header">
          <Modal.Title className="gp-finishModal__title">Game Finished</Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            {winnerName ? (
              <>
                Winner:{' '}
                <span className="gp-finishModal__winnerName">{winnerName}</span>
              </>
            ) : (
              'Winner: N/A'
            )}
          </div>

          <div className="gp-finishModal__result">{formatResultLine(game)}</div>
        </Modal.Body>

        <Modal.Footer className="gp-finishModal__footer">
          <button
            type="button"
            className="gp-finishBtn gp-finishBtn--secondary"
            onClick={() => navigate('/')}
          >
            End
          </button>

          <button
            type="button"
            className="gp-finishBtn gp-finishBtn--primary"
            onClick={() => navigate('/new-game')}
          >
            New Game
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
