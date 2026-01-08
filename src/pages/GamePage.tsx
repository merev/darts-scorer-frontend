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
  const visits = (game as any).history?.length ?? 0;
  return Math.floor(visits / playersCount) + 1;
}

function getCurrentLegNumber(game: GameState) {
  const ms: any = (game as any).matchScore;
  if (!ms || !ms.sets || ms.currentSetIndex == null || ms.currentLegIndex == null) return 1;

  const set = ms.sets[ms.currentSetIndex];
  const leg = set?.legs?.[ms.currentLegIndex];
  return leg?.legNumber ?? ms.currentLegIndex + 1;
}

/**
 * Compute all achievable X01 visit scores with up to 3 darts.
 * Dart values: 0 (miss), 1-20 singles, doubles, triples, bull 25/50.
 */
function computePossibleVisitScores(): Set<number> {
  const dartValues = new Set<number>();

  dartValues.add(0);

  for (let n = 1; n <= 20; n++) {
    dartValues.add(n); // single
    dartValues.add(2 * n); // double
    dartValues.add(3 * n); // triple
  }
  dartValues.add(25);
  dartValues.add(50);

  const values = Array.from(dartValues);
  const possible = new Set<number>();

  for (const a of values) {
    for (const b of values) {
      for (const c of values) {
        possible.add(a + b + c);
      }
    }
  }

  // Safety: should include 0..180 but with holes (e.g. 179, 185 etc.)
  return possible;
}

function getWinnerId(game: GameState): string | null {
  const anyGame: any = game;
  return (
    anyGame.winnerId ??
    anyGame.winner?.id ??
    anyGame.matchScore?.winnerId ??
    null
  );
}

function formatResultLine(game: GameState): string {
  const anyGame: any = game;

  // If backend provides a scoreline string, use it
  if (typeof anyGame.result === 'string') return anyGame.result;

  // Otherwise show a simple line
  const p1 = game.players?.[0]?.name ?? 'Player 1';
  const p2 = game.players?.[1]?.name ?? 'Player 2';
  return `${p1} vs ${p2}`;
}

export default function GamePage() {
  const params = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const gameId = (params.id || (params as any).gameId || '') as string;

  // Full-bleed mode only for this route (removes padding/white frame)
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

  // show toast for load error only
  useEffect(() => {
    if (isError) {
      showToast('Could not load game. Please try again.', 'danger');
    }
  }, [isError, showToast]);

  // detect game finished => open modal once
  useEffect(() => {
    if (!game) return;

    const prev = prevStatusRef.current;
    const curr = game.status;

    if (prev && prev !== 'finished' && curr === 'finished') {
      setShowFinishModal(true);
    }

    prevStatusRef.current = curr;
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
    if (isFinished || posting || undoing) return;

    const next = input === '0' ? d : input + d;

    // max 3 digits
    if (next.length > 3) return;

    const nextNum = Number(next);
    if (!Number.isFinite(nextNum)) return;

    // block > 180 early
    if (nextNum > 180) return;

    // If user is forming 3 digits, block impossible totals (e.g. 179, 185)
    if (next.length === 3 && !possibleScores.has(nextNum)) return;

    setInput(next);
  };

  const setQuick = (n: number) => {
    if (isFinished || posting || undoing) return;
    // quick picks are valid; still guard just in case
    if (!canSubmitValue(n)) return;
    setInput(String(n));
  };

  const backspaceOnly = () => {
    setInput((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const undoOneThrow = () => {
    if (isFinished || posting || undoing) return;

    undoThrow(undefined, {
      onSuccess: (newState: any) => {
        // After undo, show the *previous* (now-last) visit score in the input
        // so the user can keep undoing back to the beginning.
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
        // keep toast for errors
        showToast('Nothing to undo.', 'info');
      },
    });
  };

  /**
   * LEFT ARROW behavior:
   *  - if input != 0 => backspace
   *  - if input == 0 => undo one throw and load previous visit score into input
   */
  const onLeftArrow = () => {
    if (isFinished || posting || undoing) return;

    if (input !== '0') {
      backspaceOnly();
      return;
    }

    undoOneThrow();
  };

  const submit = () => {
    if (isFinished || posting || undoing) return;

    const value = Number(input);
    if (!canSubmitValue(value)) {
      // no toast on normal scoring, but this is a validation error
      showToast('Invalid score.', 'warning');
      return;
    }

    if (!currentPlayer) return;

    postThrow(
      { playerId: currentPlayer.id, visitScore: value, dartsThrown: 3 },
      {
        onSuccess() {
          // ✅ NO toast for successful scoring
          setInput('0');
        },
        onError(err: any) {
          console.error('Failed to post throw', err);
          showToast('Failed to submit score. Please try again.', 'danger');
        },
      }
    );
  };

  // Finish modal content
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
            disabled={posting || undoing || isFinished}
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
            disabled={posting || undoing || isFinished}
          >
            {d}
          </button>
        ))}

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={onLeftArrow}
          disabled={posting || undoing || isFinished}
          aria-label="Backspace / Undo"
        >
          ‹
        </button>

        <button
          type="button"
          className="gp-key"
          onClick={() => setDigit('0')}
          disabled={posting || undoing || isFinished}
        >
          0
        </button>

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={submit}
          disabled={posting || undoing || isFinished}
          aria-label="Submit"
        >
          ›
        </button>
      </div>

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
          <Modal.Title className="gp-finishModal__title">
            Game Finished
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="gp-finishModal__body">
          <div className="gp-finishModal__winner">
            {winnerName ? (
              <>
                Winner: <span className="gp-finishModal__winnerName">{winnerName}</span>
              </>
            ) : (
              'Winner: N/A'
            )}
          </div>

          <div className="gp-finishModal__result">
            {formatResultLine(game)}
          </div>
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
