import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Spinner } from 'react-bootstrap';

import { useGame, usePostThrow, useUndoThrow } from '../api/games';
import { useToast } from '../components/ToastProvider';
import type { GameState, SetScore } from '../types/darts';

import '../styles/GamePage.css';

/** helpers (kept tiny + local) */
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
  // A "round" = everyone has thrown once (one "visit" per player).
  // We approximate using history length, which your page already uses for Undo enable.
  const playersCount = Math.max(1, game.players.length);
  const visits = game.history?.length ?? 0;
  return Math.floor(visits / playersCount) + 1;
}

function getCurrentLegNumber(game: GameState) {
  const ms: any = game.matchScore;
  if (!ms || !ms.sets || ms.currentSetIndex == null || ms.currentLegIndex == null) return 1;

  const set = ms.sets[ms.currentSetIndex];
  const leg = set?.legs?.[ms.currentLegIndex];
  return leg?.legNumber ?? ms.currentLegIndex + 1;
}

function GamePage() {
  const params = useParams();
  const navigate = useNavigate();

  const gameId = (params.id || params.gameId || '') as string;

  const { data: game, isLoading, isError, error } = useGame(gameId);
  const { mutate: postThrow, isPending: posting } = usePostThrow(gameId);
  const { mutate: undoThrow, isPending: undoing } = useUndoThrow(gameId);

  const { showToast } = useToast();

  const [input, setInput] = useState<string>('0');

  if (!gameId) {
    return (
      <div className="gp-wrap">
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
    showToast('Could not load game. See console for details.', 'danger');
    return (
      <div className="gp-wrap">
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

  const scoreByPlayerId = useMemo(() => {
    const m = new Map<string, any>();
    for (const s of game.scores) m.set(s.playerId, s);
    return m;
  }, [game.scores]);

  const currentPlayer =
    game.players.find((p) => p.id === game.currentPlayerId) ?? game.players[0];

  const roundNumber = getRoundNumber(game);
  const legNumber = getCurrentLegNumber(game);

  // Legs won in current set (matches your screenshot "0 LEGS WON")
  const legsWonByPlayer = useMemo(() => {
    const ms: any = game.matchScore;
    if (!ms?.sets?.length) return {};
    const set = ms.sets[ms.currentSetIndex];
    if (!set) return {};
    return computeLegsWonInSet(set);
  }, [game.matchScore]);

  const leftPlayer = game.players[0] ?? null;
  const rightPlayer = game.players[1] ?? null;

  const leftRemaining =
    leftPlayer ? scoreByPlayerId.get(leftPlayer.id)?.remaining : null;
  const rightRemaining =
    rightPlayer ? scoreByPlayerId.get(rightPlayer.id)?.remaining : null;

  const quick = [26, 41, 45, 60, 81, 85];

  const setDigit = (d: string) => {
    if (isFinished || posting) return;

    if (input === '0') {
      setInput(d);
      return;
    }
    if (input.length >= 3) return;
    setInput((prev) => prev + d);
  };

  const setQuick = (n: number) => {
    if (isFinished || posting) return;
    setInput(String(n));
  };

  const backspace = () => {
    if (isFinished || posting) return;
    setInput((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const submit = () => {
    if (isFinished || posting) return;

    const value = Number(input);
    if (!Number.isFinite(value)) return;
    const visitScore = clamp(value, 0, 180);

    if (!currentPlayer) return;

    postThrow(
      { playerId: currentPlayer.id, visitScore, dartsThrown: 3 },
      {
        onSuccess() {
          showToast('Throw recorded.', 'success');
          setInput('0');
        },
        onError(err: any) {
          console.error('Failed to post throw', err);
          showToast('Failed to post throw. Please try again.', 'danger');
        },
      }
    );
  };

  const onUndo = () => {
    if (undoing || posting) return;
    undoThrow(undefined, {
      onSuccess() {
        showToast('Last throw undone.', 'info');
      },
      onError(err: any) {
        console.error('Failed to undo throw', err);
        showToast('Failed to undo last throw.', 'danger');
      },
    });
  };

  const isCurrent = (id?: string) => id && id === game.currentPlayerId;

  return (
    <div className="gp-wrap">
      {/* TOP BAR (in-game) */}
      <div className="gp-top">
        <div className="gp-top__left">
          <span className="gp-top__label">LEG {legNumber}</span>
          <span className="gp-top__label">ROUND {roundNumber}</span>
        </div>

        <div className="gp-top__right">
          <span className="gp-top__live">LIVE</span>

          {/* gear (hook later) */}
          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Settings"
            onClick={() => showToast('Settings coming soon.', 'info')}
          >
            ⚙️
          </button>

          {/* X: exit/back */}
          <button
            type="button"
            className="gp-iconBtn"
            aria-label="Exit game"
            onClick={() => navigate(-1)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* SCORE PANELS */}
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

      {/* INPUT DISPLAY */}
      <div className="gp-inputRow">
        <div className="gp-input">{input}</div>

        {/* small optional undo button (not in your screenshot, but useful) */}
        <button
          type="button"
          className="gp-undo"
          onClick={onUndo}
          disabled={undoing || posting || (game.history?.length ?? 0) === 0}
        >
          UNDO
        </button>
      </div>

      {/* KEYPAD */}
      <div className="gp-pad">
        {quick.map((n) => (
          <button
            key={`q-${n}`}
            type="button"
            className="gp-key gp-key--quick"
            onClick={() => setQuick(n)}
            disabled={posting || isFinished}
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
            disabled={posting || isFinished}
          >
            {d}
          </button>
        ))}

        {/* Bottom row: backspace / 0 / submit */}
        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={backspace}
          disabled={posting || isFinished}
          aria-label="Backspace"
        >
          ‹
        </button>

        <button
          type="button"
          className="gp-key"
          onClick={() => setDigit('0')}
          disabled={posting || isFinished}
        >
          0
        </button>

        <button
          type="button"
          className="gp-key gp-key--action"
          onClick={submit}
          disabled={posting || isFinished}
          aria-label="Submit"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export default GamePage;
